---
trigger: model_decision
description: 全栈代码审查规范 - Python FastAPI 与 前端项目 (React/Next.js)
globs: "*"
---

# 全栈代码审查工作流与规范 (Code Review Standards)

> **Scope (Globs)**: `["*"]`

## 1. 后端规则 (Python FastAPI)
- **健壮性**: 核心逻辑使用标准异常捕获，外部资源（数据库 Session、文件）首选上下文管理器（`with`），严禁使用裸露 `except:`。
- **安全性**: 统一使用 SQLAlchemy ORM 防止 SQL 注入；敏感路由必须注入 `Depends(get_current_user)` / `Depends(get_current_admin_user)` 鉴权。
- **文档规范**: 函数、类和方法必须遵循 Google Style Docstrings 规范，详见 `backend-python-standards.md §8`。

## 2. 数据模型 (SQLAlchemy)
- 字段类型与长度与业务匹配（如 `String(255)`），非空约束（`nullable`）与默认值（`default`）明确。
- 正确配置关系映射 `relationship` 与外键 `ForeignKey`，符合业务逻辑时声明级联删除（`cascade="all, delete-orphan"`）。
- 高频查询与唯一性字段必须声明索引（`index=True`）。

## 3. API 与 RESTful 标准
- **路径设计**：遵循 RESTful 规范（详见 `global-standards.md §6`），使用复数名词资源路径，严禁包含动词（如 `/api/v1/cases` 而非 `/api/get_case`）。
- **统一响应**：业务端点显式声明 `response_model`，统一封装为 `UnifiedResponse` 格式，严禁返回裸字典。

## 4. 前端规则 (React/Next.js)
- **防御性渲染**: 深层嵌套的 API 响应数据使用可选链（`?.`）与默认兜底值。
- **错误捕获**: 显式捕获 API 错误并向用户提供友好的 UI 反馈（Toast / EmptyState），严禁静默吞掉网络异常。
- **资源清理**: 组件内定时器与全局事件监听器必须在 `useEffect` 清理函数中正确释放，防止内存泄漏。

### 4.1 frontend-v2 架构约束（见 `frontend-standards.md`）
- **薄 Page**：`page.tsx` 建议 ≤ 150 行（弹性上限 250~350 行）；主要负责骨架布局与 Provider 挂载，数据请求统一收敛至 `lib/queries/` 或路由专属 hooks，严禁页面直连 API Client。
- **体量审查与薄视图原则**：依文件职责分类审查。类型契约与静态映射豁免行数；业务抽屉/复杂面板（弹性上限 700~800 行）看逻辑与表现是否解耦（复杂状态/请求下沉至 Hook），允许声明式 JSX，严禁机械拆散仅单处引用的私有子视图（反过度组件化）。
- **分层解耦**：格式化收敛至 `lib/format.ts`，领域数据标准化收敛至 `lib/normalize/*`。
- **依赖方向**：`lib` 严禁反向 import `app/(main)/*/types`，跨层类型统一放入 `src/types/`。

## 5. 本地静态验证 (Static Verification)
审查时优先执行本地静态检查（遵循增量优先原则，仅针对变更文件）：
- **后端 Python 验证**: `ruff check <files>`、`mypy <files> --config-file mypy.ini`、`pytest <test_file> -v`
- **前端验证 (frontend-v2 / admin-frontend)**: `pnpm lint`、`pnpm typecheck`
- **质量门禁**: 存在报错时优先排查修复，未通过静态检查不予判定审查通过。
- **测试审查策略 (抓大放小 · 主干契约优先)**: 放弃防御性完美主义，严禁强求编写繁琐易碎的 UI 组件级单测，非核心 UI 瑕疵踩坑再修；仅在修改核心状态机、支付、关键落库等致死路径时，针对性验证对应 Playwright E2E 或高价值集成用例。

### 5.1 修复复核证据（176 复盘）

- 以实际 HEAD / 工作区为基线，按“原触发→当前行为→证据→残留/新回归”逐项对账；文档勾选、提交标题与“已核销”记录不能替代代码核验。
- 异步资源生命周期问题至少验证真实入口到清理；只 mock 掉外部 DB/Redis/模型服务，不把待验证的 runner、恢复器或事件管线整体替换成简单生成器。
- 用真实 ORM / Pydantic 实例及实际 SQL 核对属性和数据契约，不能靠带有虚构字段的 Mock 验证身份判断。对缓存完整/缺失、session 存在/不存在分别验证可达分支。
- 断言实际业务后果：任务已停止、没有释放后写入、新租约仍有效、重置后读不到旧值、主 checkpoint 身份不变；只断言抛异常、发 error 或测试通过不足以核销。
- 共享流式封装修复既要跑负向故障路径，也要完成一次正常流，核对最终 DB 状态及终态事件顺序。跨 Task 包装尤其检查 ContextVar。
- 保留可复现的 fixture、运行命令、基线与输出；临时探针结论要写进持久文档，关键场景由后续修复吸收到少量集成回归中。按同一根因合并问题，避免不同轮次重复计数。

### 5.2 修复复核证据（178 复盘：防局部补丁、伪绿灯与端到端消费穿透）

- **防局部打补丁（Anti-Point-Patching）与全生命周期推演**：针对报错或前轮审查指出的缺陷，严禁仅在单点加 `if` 过滤规避（如针对单材料报错加了过滤，却未推演已定稿项重跑时必然缺少映射触发 `KeyError`；针对二分法处理举证方，却遗漏法定第三方材料混合；过滤历史条目后未联动重算真实物理页数）。修复必须系统推演输入数据全集（如法定原告/被告/第三人三方边界，非简单布尔二分）与生命周期全状态（初始生成、定稿锁定、重置重跑）。
- **拒绝越过消费端的伪绿灯（End-to-End Consumer Verification）**：后端产出的集合、标识与契约，必须向后推演到最终消费端（前端组件真实渲染、PDF 最终输出）。单测不能只断言 `len(items) == 2` 或不抛异常，必须断言真实的业务后果：
  1. 验证跨批次/跨分区合流后的全局条目标识唯一性，验证输入前端组件（如 `CatalogTable`）后真实渲染行数不被跳过或隐藏；
  2. 验证物理介质与文本一致性，PDF 封面、目录与正文水印的起始页与总页数必须与转换后的真实物理文件端到端一致，测试必须验证实际导出的 PDF 正文文字而非仅空白页；
  3. 验证跨微服务契约透传，核心引擎 $\to$ 业务后端 Domain $\to$ DTO $\to$ 前端，必须验证关键字段（如聚类规范名称 `name`）未被中间层 Pydantic 校验静默过滤丢弃。
- **计算工程切片（Batching）不得侵入业务领域**：规避 Token 上限的分批处理属于 Map 计算，必须具备全局 Reduce / Reconcile 归并对账。审查时必须核验跨批次属于同一会话或主题的业务材料是否被自动聚合，严禁出现跨批断裂。

## 6. 核心负向约束 (Hard Constraints)
- **禁止裸露异常**: 严禁在 Python 中使用 `except:` 或 `except Exception: pass`。
- **禁止 URI 动词**: 严禁在 API 路径中包含动作谓词。
- **禁止吞没错误**: 严禁在前端捕获网络错误后仅打印 console，必须提供用户态反馈。
- **禁止绕过静态审查**: 未在本地真实执行增量静态检查前，严禁宣称审查通过。

## 7. 相关技能 (Related Skills)
- **`code-review`**：全栈代码审查 SSLM 框架（Security/Standards/Logic/Maintainability）。具体审查任务可通过该技能生成结构化审查报告，并配合本地静态检查。

完整技能索引参见 `.agents/skills/README.md`。
