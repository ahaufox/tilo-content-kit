---
trigger: model_decision
description: 流式处理前后端统一规范，包含 SSE 事件格式与 AI 响应解析约束
globs: "backend/**/stream*.py, frontend-v2/**/stream*.ts, frontend-v2/**/hooks/use*Stream*.ts"
---

# 流式处理前后端统一规范

> **Scope (Globs)**: `["backend/**/stream*.py", "frontend-v2/**/stream*.ts", "frontend-v2/**/hooks/use*Stream*.ts"]`

## 1. 适用范围

本规则适用于仓库内所有后端 SSE 流式端点与前端流式消费代码：
- 后端：`routers/analysis/`、`routers/asr/`、`routers/orchestrator.py` 等所有返回 `StreamingResponse` 的端点
- 前端：`sse-parser.ts`、`workflowStreamManager.ts`、`agent-refine.ts` 等所有消费 SSE 流的模块

### 底层协议单一事实来源 (SSOT)
系统基于 RFC 8895 标准的完整 SSE 流式通信协议规范、三段式事件帧格式、完整事件枚举体系（`SSEEventType`）、核心数据契约（`BaseSSEContract` / `SSEEventEnvelope`）、前后端字段名自动转换机制（Python `snake_case` → 网关导出 `camelCase`）、PAE 状态信标以及心跳保活与断线重连机制，必须严格以以下文档为单一事实来源：
- **[tilo-backend-app/backend/schemas/streaming/sse流式事件说明.md](../../tilo-backend-app/backend/schemas/streaming/sse流式事件说明.md)**

## 2. 原则

### 原则 1：统一事件鉴别键

所有 SSE data 行 JSON 的顶层必须使用 `"type"` 键标识事件类型，格式为 `{"type": "<TYPE>", ...}`。

**禁止**使用 `"event"`、`"eventType"` 或其他键名替代。

### 原则 2：统一工具函数

后端所有 SSE 端点必须通过以下两个函数构造响应，**禁止内联手写** SSE 格式字符串或 `StreamingResponse`：

| 工具函数 | 来源文件 | 用途 |
|---|---|---|
| `format_sse_event(data: dict) -> str` | `backend/utils/streaming/stream_response.py` | 将字典格式化为 `"data: {JSON}\n\n"` 标准 SSE 行 |
| `create_streaming_response(gen, headers?) -> StreamingResponse` | `backend/utils/streaming/stream_response.py` | 创建带统一标准 headers 的 `StreamingResponse` |

### 原则 3：统一响应头

所有 SSE 端点必须使用以下响应头（由 `create_streaming_response()` 注入）：

```
X-Accel-Buffering: no
Cache-Control: no-cache, no-store, must-revalidate
Pragma: no-cache
Expires: 0
Connection: keep-alive
```

### 原则 4：前端必须统一解析入口

所有前端流式消费必须通过 `sse-parser.ts` 的 `consumeSSEReadableStream()` 或 `connectSSE()` 进行解析。

**禁止**直接操作 `ReadableStream` 或自行按行分割 SSE。

### 原则 5：前端类型必须与后端同步

`frontend-v2/src/types/stream.ts` 中的 `SSEEvent.type` 联合类型必须涵盖所有后端实际使用的事件类型。

## 3. 标准事件类型

> 完整且权威的事件枚举（`SSEEventType`）和 Payload 契约定义以 **[sse流式事件说明.md](../../tilo-backend-app/backend/schemas/streaming/sse流式事件说明.md)** §2、§3 为准。

### 3.1 工作流引擎事件

```json
// chunk — 流式文本块（逐字推流）
{"type": "chunk", "data": {"node_id": "...", "content": "...", "logical_stage": "...", ...}}

// stage_update — 节点状态/产出更新（节点完成时整块推送）
{"type": "stage_update", "data": {"node_id": "...", "status": "completed|running|error", "payload": {...}, ...}}

// interrupt — 工作流中断，等待用户确认
{"type": "interrupt", "data": {"thread_id": "...", "next_nodes": [...], "message": "..."}}

// done — 流程完成
{"type": "done", "data": {...}}
```

### 3.2 Agent 微调事件

```json
{"type": "agent_chunk",       "data": {"content": "..."}}
{"type": "agent_suggestions", "data": {"suggestions": [...]}}
{"type": "agent_done",        "data": {"full_content": "..."}}
{"type": "agent_error",       "data": {"message": "..."}}
```

### 3.3 通用事件

```json
{"type": "error",  "content": "错误描述"}
{"type": "init",   "data": {...}}
{"type": "status", "content": "..."}
{"type": "text",   "content": "..."}
```

## 4. 后端实现清单

新增 SSE 端点时，必须遵循：

1. 导入工具函数
```python
from utils.streaming.stream_response import format_sse_event, create_streaming_response
```

2. 使用 `format_sse_event()` 构造每条 SSE 消息
```python
# 正确
yield format_sse_event({"type": "chunk", "data": {"content": delta}})

# 错误（禁止内联构造）
yield f"data: {json.dumps({'type': 'chunk', 'data': {'content': delta}})}\n\n"
```

3. 使用 `create_streaming_response()` 返回响应
```python
# 正确
return create_streaming_response(event_generator())

# 错误（禁止内联 StreamingResponse + 手动 set headers）
return StreamingResponse(
    event_generator(),
    media_type="text/event-stream",
    headers={"X-Accel-Buffering": "no", ...}
)
```

## 5. 前端实现清单与交互状态机铁律

1. **统一消费入口**：通过 `consumeSSEReadableStream()` 或 `connectSSE()` 消费 SSE；
2. **事件解析契约**：SSE 事件类型严格从 `event.type` 读取，类型定义引用 `SSEEvent` 接口（来自 `@/types/stream`）；
3. **异常断流 Settlement 兜底（Anti-Hanging EOF 铁律）**：
   - 当服务端进程崩溃、网络闪断或流正常 EOF 但未发出 `done` / `error` 事件时，外层封装的 Promise 必须挂载安全结算兜底（`safeResolve` / `safeReject`）；
   - **严禁**使 Promise 永久处于 pending 状态，必须在 EOF、catch 与 finally 块强制复位 `isStreaming: false`，彻底杜绝输入框和交互面板被永久死锁；
4. **会话切换快照与串扰防御（Session Snapshot Isolation）**：
   - 发起流式请求时必须快照记录当前 `requestSessionId`；
   - 收到消息落地或追加通知时，必须比对 `requestSessionId === currentSessionId`；
   - 若用户已在流式期间切换至其他会话，必须安全丢弃旧流内容并打 warn 日志，**严禁将旧流 chunk 追加落地至新会话**造成串扰；
5. **并发重入同步引用锁（Synchronous Lock）**：
   - 防重复提交严禁仅依赖异步 React state（如 `isStreaming`）；
   - 必须配合 `useRef` 同步布尔锁（如 `isStreamingRef.current`），在触发请求的第一行同步置为 `true`，快速连续点击时立即短路拦截；
6. **组件卸载 Cleanup Abort**：
   - 消费流式的 Hook 必须挂载 `useEffect` 清理函数，在组件卸载或 `caseId` 切换时显式调用 `abortController.abort()`，阻断孤儿流后台静默拉取。

## 6. 检查清单

审查流式相关代码时，必须检查：

- [ ] 是否使用了 `format_sse_event()` 而非内联 f-string
- [ ] 是否使用了 `create_streaming_response()` 而非内联 `StreamingResponse`
- [ ] SSE data 行 JSON 顶层键名是否为 `"type"`
- [ ] 响应头是否包含完整五件套
- [ ] 前端是否通过 `sse-parser.ts` 统一入口消费流
- [ ] 前端 `SSEEvent.type` 类型定义是否覆盖所有后端事件类型
- [ ] 流式 Promise 是否具备 EOF / 异常中断下的自动 settle 与 `isStreaming: false` 复位
- [ ] 流式追加与产物落地是否进行了会话快照隔离（防跨会话串扰）
- [ ] 是否使用了 `useRef` 同步锁防御连续并发点击

## 7. 参考：LangGraph 流式实现示例

LangGraph 官方提供的流式处理参考（流式事件分发、消费者管理与连接生命周期模式）：
- **官方文档与 API 查阅**：开发前优先查阅 LangGraph 官方流式文档与 API 指南。
- **核心模式**：重点关注 `streamEvents(v3)`、`GraphRunStream`、`stream-tokens`、`stream-values`、`stream-updates` 等流式分发与事件解包模式。

实现本项目 SSE 端点时，应参考上述模式保持流式事件分发、消费者管理和连接生命周期的规范统一。

## 8. SSE 链路底层：Custom Fetch Adapter 约束

本规范覆盖 SSE **事件格式与解析入口**。SSE 链路最底层的 `Axios → fetch` 适配器约束（非 2xx 抛错契约、signal/timeout 共存、withCredentials 映射、单测覆盖强制要求）见：

- [frontend-standards.md](./frontend-standards.md)（custom-fetch-adapter 部分）

涉及流式 401 / 取消 / 超时的 bug 修复时，必须**同时**检查该规则与本规范的对应约束，避免单边修改破坏契约。

## 9. 前端 AI 响应解析约束 (AI Response Parsing Rule)

本规范覆盖 SSE **事件格式与解析入口**。前端 AI 响应解析的约束（安全 JSON 解析、文本归一化、类型安全）见：

### 9.1 安全 JSON 解析 (Safe JSON Parsing)
- **宽容解析**: 由于 AI 返回的 JSON 结构可能存在细微瑕疵（例如使用 Python 风格的单引号字典字符串，或者在 JSON 外包裹了 Markdown 代码块），必须使用安全的解析函数，而不是直接调用 `json.loads`。
- **降级策略**: 如果 JSON 解析完全失败，系统应当有合理的默认值降级或抛出明确的解析异常，防止未捕获异常导致服务或渲染崩溃。

### 9.2 文本归一化 (Text Normalization)
- **清理 AI 伪影**: 提取标题或文本内容时，必须实现归一化逻辑，移除 AI 生成时可能残留的占位符（如 `[Insert Title Here]`）、首尾多余的引号，以及 JSON 结构的碎片残留。
- **前端展示**: 前端组件在接收到这些文本时，也应进行标准化的显示处理，防止脏数据破坏 UI 布局。

### 9.3 类型定义与错误处理 (Types & Error Handling)
- 增强相关的类型定义，确保从解析层到业务层的数据类型安全。
- 在发生解析错误时，日志应当记录原始的异常返回文本，以备后续分析和优化 Prompt。

## 10. 相关技能 (Related Skills)

执行本规则前，应加载以下技能：
- **`tdd`**：解析函数通过属性测试覆盖各种畸形输入（Python 单引号、Markdown 代码块包裹、截断 JSON 等）。
- **`workflow-ops`**：LangGraph 工作流配置管理，流式接口涉及多工作流状态机时确认协议事件类型契约。
- **`e2e-testing`**：从 `openapi.json` 自动生成 Playwright API Mock，保持前后端事件类型一致。

完整技能索引参见 `.agents/skills/README.md`。
