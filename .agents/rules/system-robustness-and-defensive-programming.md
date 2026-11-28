---
trigger: always_on
---

# 防御性编程与系统健壮性规范 (System Robustness)

> **Scope (Globs)**: `["*"]`

## 1. 状态机与 UI 交互解耦

- **UI 交互事件与业务路由解耦**:
  - 对于仅影响视图表现的操作（如面板展开、折叠、Tab 切换），**严禁**与 URL 参数强绑定并直接触发 `router.push`。
  - 路由自动同步（如空缺参数时自动选中首个活跃项）必须在顶层 Layout/Page 做防抖控制，避免穿透式重定向循环。

## 2. 大模型输出提取与上下文容错 (SSOT)

- **XML 结构化标签提取 (SSOT)**:
  - 从大模型输出中提取 `<thinking>`, `<legal_analysis>`, `<action_plan>`, `<json_payload>` 等标签时，**强制统一使用 `backend/utils/llm/xml_blocks.py` 中的 `extract_xml_block` / `extract_all_xml_blocks` 作为唯一入口**。
  - **严禁**散落手写 `re.search` 正则或裸切字符串。
- **防御性兜底防误解红线**:
  - 兜底降级（Fallback）逻辑在 LLM 异常或超时时，**严禁拟造具体业务分析结论**（例如把质证真实性硬编码为“系单方出示，真实性存疑”）。
  - 防御性兜底必须保持**语义中立、状态透明**（统一使用 `"暂无"`、`"未生成"` 或空值），防止误导用户以为是模型深度研判产出。
- **兜底正文元指令净化与防提示词泄露 (210 复盘)**:
  - 降级或自适应兜底文书模板必须使用正规司法公文表达，**严禁将提示词工程内部的元指令/门禁规则词（如“诉求纯净化红线”、“事实四分尺度”、“门禁反模式”）写进交付用户的实体文书**。
  - 模板变量插值造句时严防文书标题（如《民事上诉状》）机械当成案件裁判或事实主体（严禁出现“《民事上诉状》认定事实不清”），必须遵循法律文书事实归属客观句式。

## 3. 异步任务与数据库会话防范

- **异步任务上下文注入**:
  - 后台 Worker 执行任务时，必须在边界强校验并显式通过 `set()` 注入 `user_id_var` / `tenant_id_var` 等 `ContextVar`，并在 `finally` 块中 `reset` 还原。
- **连接释放与生成器防护**:
  - 在异步任务或中间件中获取数据库 Session 时，必须使用 `async with async_session_maker()`，**严禁**使用 `async for` 遍历 session 生成器并提前 `break`（会导致生成器的 `__aexit__` 无法触发引发连接池泄漏）。
- **后台长期任务强引用防 GC**:
  - 使用 `asyncio.create_task` 启动长期运行任务时，必须保持模块级强引用集合（如 `_tasks: set`），并在任务结束的回调中清理，防止被 Python GC 提前回收导致静默失败。
- **SQLModel 时间字段时区防呆**: 规则与病理说明见 `backend-python-standards.md §4`（naive datetime 必须显式 `sa_type=DateTime(timezone=False)`）。

## 4. 业务文件持久化与自愈交付

四条铁律（本地/scratch 不得作唯一存储、生成即入桶、正文双轨留存、下载端点 JIT 自愈）见 `global-standards.md §2` 红线；实现细节见 `infra-minio-storage-standards.md §9`。

## 5. 级联重置、数据抹除与破坏性接口防呆铁律

- **按依赖拓扑逆序清理**：凡涉及级联删除或重置（如样板案重置、案件归档清退），必须严格按照外键依赖拓扑由叶到根逆序清理关联子表（含协作文书、审计记录、解析任务等），严禁越过子表直接物理 DELETE 父表触发 IntegrityError 500 崩溃。
- **实体字段名严格核实**：在组装对象存储键或操作实体字段时，必须严格比对 ORM 模型的真实属性名（如 `FileMetadata.bucket`、`object_key`），严禁凭记忆与手滑拼写臆造字段名（如 `bucket_name`、`file_key`）引发运行时 AttributeError。
- **确认参数防误触与 409 拦截**：凡破坏性数据抹除/重置接口，强制挂载 `confirm: bool = Query(True)` 防误触；捕获到 `IntegrityError` 时必须统一转换为语义明确的 HTTP 409（Conflict）异常响应并附带具体冲突说明，严禁回吐 500。
- **单条重置严禁破坏性扩散**：针对演示案/样板案的单案就地重置，必须强制显式透传 `case_id`（如 `reset_demo_cases(db, user_id, case_id=existing_case.id)`），严禁在单案重置时缺省 `case_id` 导致将属主名下的所有关联案件一并清退。

## 6. 批量长事务处理中的局部事务切片隔离 (SAVEPOINT)

- 在批量遍历处理（如多用户算力配额滚动刷新、批量文书同步归档）中，**严禁在一个裸长事务内无保护地连续执行多条实体的写操作**。
- 单个实体的处理必须使用局部事务切片：
  ```python
  for item in items:
      try:
          async with session.begin_nested():  # SAVEPOINT 隔离
              await process_single_item(session, item)
      except Exception as exc:
          logger.warning(f"处理单项失败: {item.id}, 错误: {exc}", exc_info=True)
          # 局部事务已自动回滚，外部长事务连接不受污染，可安全继续下一项
  ```
- 杜绝单个实体违反 SQL 约束（如唯一键冲突）导致 asyncpg 驱动进入 `InFailedSqlTransactionError` 事务中毒状态，避免整批全部失败与级联中断。

## 7. 前端轮询状态机防死循环与熔断保护

- **熔断计数与超时停表**：所有使用 `useQuery` 的轮询 Hook（如订单支付状态轮询 `usePollOrder`），严禁仅依赖 `status` 终态判断；必须内置：
  1. **连续错误熔断计数器**（如 `errorUpdateCount >= 10` 停止轮询并触发 Toast 友好提示）；
  2. **最长生命周期超时保护**（如超过 15 分钟强制停止轮询，并主动提示刷新重试）。
- **防御 NaN 目标时间**：倒计时 Hook（如 `usePayCountdown`）接收 deadline 参数时必须校验 `isValidTarget`，防御非法 Date 导致的 `NaN:NaN` 显示，且倒计时到 0 时必须显式 `clearInterval` 清理定时器。

## 8. 前端流式断流挂死、会话隔离与底层协议防范

- **断流结算兜底 (Anti-Hanging EOF)**：SSE 流式调用时外层 Promise 必须挂载安全结算兜底（`safeResolve` / `safeReject`），在 EOF、服务端异常或网络中断时必须强制复位 `isStreaming: false`，杜绝交互死锁。
- **会话快照比对 (Session Snapshot)**：收到流式 chunk 与产出追加时必须比对 `requestSessionId === currentSessionId`，切换会话时安全丢弃旧流内容，杜绝跨会话串扰。
- **防并发重复点击 (Synchronous Lock)**：发起流式请求时必须通过 `useRef` 布尔锁同步加锁，杜绝依赖异步 state 导致的并发重入。
- **底层协议与事件契约 SSOT**：
  - 前后端流式处理统一规范参见 [streaming-standards.md](./streaming-standards.md)；
  - 完整 SSE 通信协议规范、事件枚举体系（`SSEEventType`）与数据契约单一事实来源详见 **[tilo-backend-app/backend/schemas/streaming/sse流式事件说明.md](../../tilo-backend-app/backend/schemas/streaming/sse流式事件说明.md)**。
- **网关递归键名转换与卡片双轨归一化铁律 (SSE CamelCase Conversion & Dual-Track Normalization)**：
  - 后端 SSE 网关出口（`stream_response.py::format_sse_event`）会递归将所有 dict 的键名由 `snake_case` 转为 `camelCase`（如 `card_type` 转为 `cardType`，`total_chars` 转为 `totalChars`）；
  - 前端在解析与定义智能体结构化卡片载荷（如 `DocumentReaderCardData`）及卡片分发器（`CopilotCardDispatcher`）时，**必须显式定义双向兼容键名并使用归一化解构**（`const effective* = card.camelCase ?? card.snake_case`），严禁仅按静态 `snake_case` 假设读取，杜绝流式完成瞬间属性静默丢失。
- **流式转完成态全量轨迹继承与双态验证门禁 (Dual-Phase State Retention & Verification Gate)**：
  - 当 SSE 流收到 `done` 或正常结束时，Runtime（如 `useChatRuntimeActions.ts`）持久化追加完成态助手消息时，**必须完整继承流式期间触发的全部工具调用轨迹（`toolCalls`）与阶段历史（`milestones`）**，严禁传 `undefined` 导致历史轨迹突变消失；
  - 凡涉及流式与卡片渲染的变更，**必须同时覆盖 In-Flight 运行态与 Completed 完成态的双态验证**，杜绝生命周期切换时丢失卡片。

## 9. 核心引擎 Zero-DB 与 ContextVar 提前绑定污染门禁

- **纯无状态认知计算**：核心研判引擎（`tilo-core-engine/`）所有工具与配方执行器必须严格遵循 Zero-DB 契约，严禁反向导入 ORM `repositories` 或直连数据库，所有案情与文件上下文由 `input_context` / `dossier` 或专线 RPC 回调提供。
- **校验在前，绑定在后**：在 Runner 适配层组装请求时，参数与模型校验（`validate_input`）必须先于 `current_case_id_var.set()` 执行；严禁在未进入 `try...finally` 保护块前绑定上下文变量，防止入参非法（422）时残留的 ContextVar 泄漏污染后续请求。

## 10. 分批切片与领域无感铁律 (Batching Map-Reduce Isolation)

- **Map-Reduce 归并对账 (Batching Reconcile)**：针对规避大模型上下文上限或超时而进行的数据分批处理（如每批 30 份材料分块提炼/聚类），分批仅是底层的 Map 计算工程手段，业务领域层**必须具备全局 Reduce / Reconcile 归并对账阶段**。
- **严禁暴露工程切片痕迹**：严禁将批次结果以粗暴 `list.extend` 追加的形式直接暴露给调用方，导致跨越批次边界的同一业务实体（如跨批次的同一个连续会话、同一合同多附件）被机械切割为两个独立碎片条目。
- **编排器提示词与对账对齐**：分批编排器提示词与输入映射必须同步支持分批聚类输出，并在合流阶段按业务唯一主题、时间线或成员关联进行跨批归并。
- **数量修饰与实体标识严格区分（防账号被误删）**：在对条目名称进行正则清洗（如去除批次修饰、份数）时，数量修饰必须显式包含明确的中文量词单位（如 `份/页/张/件/卷/笔/条`）或包含 `共` 字前缀；**严禁将括号内的纯数字（如银行账号、卡号、尾号、身份证后四位）当作数量删除**，导致两个不同账户的流水或凭证被错误识别为同源而误合并。

## 11. 跨层契约与领域模型字段透传门禁 (End-to-End Field Transmission Gate)

- **单向无损透传**：微服务跨边界流转（如 `Core Engine Output -> Backend Domain Model -> DTO / API Response -> Frontend View`）必须保证字段的单向无损透传。
- **严禁中间层静默丢字段**：严禁底层核心引擎与上层 DTO 均声明了某字段（如聚类规范名称 `name`），而中间领域模型（如 `EvidenceDirectoryItem`）漏声明，导致 Pydantic 领域校验在反序列化时**静默丢弃未知字段**，使后续业务富化器或渲染层因取空而错误退回首件文件名降级。
- **全链路契约断言**：契约验证必须覆盖“引擎生成 $\to$ 领域校验 $\to$ DTO 导出 $\to$ 消费端”全链路，严禁仅以带字段的假对象（如 SimpleNamespace）绕过真实 Pydantic 模型测试。

## 12. 物理介质与物化渲染两阶段校准铁律 (Two-Phase Physical Materialization)

- **转换测量在前，物化呈现在后**：涉及物理介质（如 PDF 生成、物理页码、正文水印、纸质封面）的业务流程，必须严格遵循“**物理原件转换与测量 $\to$ 统计回填与状态校准 $\to$ 最终物化呈现**”的两阶段单向时序链。
- **严禁提前固化物理断言**：严禁在物理原件尚未完成转换与实际页数测量之前，提前绘制并固化印有总页数的封面或目录页（例如封面提前打印“全案装订共 5 页”，而正文转换后实际产生 6 页，导致卷首文字与物理现实产生不可磨灭的脱节）。
- **集合变动物理指标重算**：过滤或重组历史物理条目时，必须根据剩余的物理实体集合重新计算 `physical_page_count` 与起始页拓扑，严禁仅修改成员 ID 列表却沿用旧的物理统计缓存。

## 13. 标识命名空间隔离与前端消费去重防穿透 (Item Identifier Namespace & Frontend Key Scoping)

- **模型局部序号防穿透**：大模型局部输出的标识序号（如 `cluster_1`, `cluster_2`）仅在单次生成内部局部有效，严禁直接作为跨分区、跨会话或跨批次的全局持久化主键；合流时后端必须为条目标识施加全局唯一命名空间（或服务端 UUID / 稳定散列）。
- **前端渲染作用域隔离**：前端渲染组件（如多组表格、复杂列表）在进行已渲染追踪（`renderedSet`）或 `key` 绑定时，必须以复合作用域（如 `${groupId}_${itemId}`）或对象引用集合（`Set<ItemObject>`）作为判断依据，严禁使用裸露的局部条目 ID 进行跨组全局去重，杜绝第二个同名条目被前端静默跳过导致整行证据丢失。

## 14. 异步批处理与流式传输中的回退熔断防 OOM (Guarded Fallback & Memory Safeguard)

- **严禁裸回退为全量内存加载**：当流式拉取（`stream=True`）因网络中断或服务超时异常失败时，**严禁无限制回退为全量内存加载（`stream=False`）**。
- **大文件二次熔断拦截**：在异常处理分支（`except Exception:`）中必须再次进行容量或阈值二次校验。若单文件已知大小超过安全阈值（如绝对阈值 >64MB 或 > 累计剩余预算的 30%），必须立即熔断跳过全量回退，将其记入部分失败报告（如 `部分文件读取失败说明.txt`）并继续处理剩余文件，杜绝单一大文件击穿内存常驻上限导致 Python 进程 OOM 崩溃或阻塞主事件循环；仅对 ≤64MB 的常规小文件允许自愈回退全量 bytes。
- **全失败明确语义**：若批处理所有条目均失败，必须抛出明确的 422 业务异常阻断后续无效打包，严禁吐出 0 字节的空包。

## 15. 控制参数真实生效与死参数防范 (Dead Parameter & Active Branching Gate)

- **重构逻辑防参数退化**：在重构、抽离或下沉业务逻辑时，若接口或函数签名中声明或保留了控制参数（如 `fallback_to_template: bool`、`enable_cache: bool`），必须确保其在内部有真实的判断分支和差异化行为，严禁参数沦为“传 True 或 False 内部行为毫无二致”的死参数。
- **正反分支双向单测覆盖**：对带有控制开关的函数，必须编写正反双向的单测用例并断言不同的业务后果（例如：`fallback_to_template=True` 返回降级大纲，`fallback_to_template=False` 抛出 `PlanningExecutionError`），防止虚假分支被重构代码静默遗漏。

## 16. 领域与配置异常分层透传，严禁宽泛改写导致归因断裂 (Explicit Exception Propagation)

- **宽泛异常捕获防归因破坏**：在兜底逻辑或包装器中，严禁顶层直接使用宽泛的 `except Exception` 将配置缺失（如 `RecipeNotFoundError`、`FileNotFoundError`）盲目改写为通用业务执行失败（如 `PlanningExecutionError`）。宽泛吞没会导致调用方和运维人员无法区分是“环境配置缺失”还是“模型推理失败”。
- **前置特定异常显式抛出**：在顶层捕获前，必须前置 `except RecipeNotFoundError: raise` 等专有异常分支，保留原始异常类型并在 Docstrings 的 `Raises` 章节中准确声明。

## 17. 正则与常量提取调用点一致性 (Constant Extraction & Semantic Parity)

- **调用点全面替换**：从局部逻辑或循环中抽取公共常量（如 `ABSTRACT_CRITIQUE_PATTERN`）或校验规则时，必须全局替换所有既有的内联硬编码，严禁只定义常量却未在实际调用点引用，导致常量形同虚设。
- **修饰符与量词语义对齐**：抽取正则常量时，必须仔细核对量词与修饰符（如末尾量词 `?` 的取舍），防止常量抽离过程中无意放宽或收紧匹配语义，进而引发规则误杀或漏杀。

## 18. 跨微服务契约 (514 专案)

回填判型、三处强类型同构门禁与专线入站反序列化的实现细则见 `backend-python-standards.md §3.5`，本文件不重复。

## 19. 相关技能 (Related Skills)

- **`tdd`**：LLM 边界容错单测覆盖。
- **`e2e-testing`**：跨组件与全链路交互端到端回归。
