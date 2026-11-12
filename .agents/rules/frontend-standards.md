---
trigger: model_decision
description: React & 前端工程开发规范，包含组件 Props 跨调用点审计、状态管理、类型契约、文件下载与接口防呆。
globs: "src/**/*"
---

# React & 前端工程开发规范

> **Scope (Globs)**: `["src/**/*"]`

> **视觉规范提示**：本文件主要约束前端架构、类型与状态流转。UI 排版、Design Token、颜色与响应式约束必须遵循 `.agents/rules/design.md`。

## 1. 组件 Props 跨调用点审计 (Cross-Call-Site Audit)
- **C1**：向共享组件修改/新增 Props 时，**必须**使用 `rg` 或 `grep` 搜索该组件在项目中的所有渲染调用点（包括测试文件）：
  ```bash
  rg -n "<ComponentName" src/
  ```
- **C2**：如果组件在同一页面渲染多次（如：主编辑器 + 只读 Dialog），必须逐一检查所有实例的 Props 传递，并在测试中使用具体特征值（如 `docId`）精准过滤并验证主/次要渲染实例，不得依赖时序假设。
- **C3（Props 零弃婴门禁）**：向组件接口（Interface）声明新增可选或必选 Props 且调用端已传参时，必须确保在组件内部有真实的消费逻辑。严禁在接口声明、调用端传参但在组件内部未解构、未消费导致变成“弃婴 Props”；若确系向后兼容占位，必须在接口字段上方显式添加注释说明理由。

## 2. 日志输出规范 (Logging Standard)
- **C1**：所有前端日志必须使用 `src/lib/logger.ts` 的 `logger` 实例，**禁止使用 `console`的原生方法**。
- **C2**：`logger.log/warn/info/debug` 在开发环境输出，生产环境静默。
- **C3**：`logger.error` 仅限不可预期的异常捕获（会触发 `errorReporter` 拦截并上报至后端），**禁止**在常规业务路径（如用户操作反馈、常规校验）中使用。

## 3. 依赖方向与目录放置规范 (Dependency & Structure)
- **依赖树**：
  `src/types/` ← `src/lib/normalize/` ← `src/lib/queries/` ← `src/lib/store/` ← `src/hooks/` ← `src/components/` ← `src/app/`
  - **禁止逆向依赖**：底层的 `lib/` 或 `components/` 严禁反向 `import` `@/app/...` 的页面私有类型/函数。
  - **组件防漏层**：禁止在 UI 组件、Layout 页面内直接导入 `api` 发送请求。数据请求必须收敛至 `lib/queries/` 或路由专属 hooks 中。
- **目录划分与体量分级治理（按职责与复杂度度量）**：
  - 基础/通用原子卡片：`components/ui/v3/`（优先复用已有 V3 组件，禁止重复造轮子或使用 legacy V2 组件）。
  - 单一路由专用组件：`app/(main)/<route>/components/`。
  - 跨两个以上路由复用的业务 UI：`components/<domain>/`。
  - **类型契约与静态映射 (`types/`, `constants/`)**：**豁免物理行数硬上限**，优先保持领域类型与常量集中管理 (SSOT)，严禁为凑指标机械切散。
  - **页面级编排 (`page.tsx`)**：保持薄 Page，推荐 ≤ 150 行，弹性上限 250~350 行，数据与状态剥离至 Hook。
  - **业务抽屉/弹窗/复杂面板 (`*Drawer.tsx`, `*Dialog.tsx`, `*Panel.tsx`, `*Workspace.tsx`)**：
    - 推荐行数 ≤ 400 行，**弹性上限 700~800 行**。
    - **薄视图原则（逻辑表现分离）**：API 请求、副作用与复杂数据处理必须下沉至 Hook/Store。若长行数纯属声明式 JSX 布局树、多 Tab 或样式排版，认知负荷低，原则上允许在单文件内声明；
    - **反过度组件化与免拆原则**：严禁机械式把单处消费、无复用价值的私有视图（如局部头部、纯文案提示）强行拆成碎文件，增加跨文件传参与阅读成本；当且仅当包含多独立可拆卸模块（如文书工具箱多独立 Tab、复杂表单）时，才建议采用组合模式（Composition Pattern）拆分子目录。
  - **自定义 Hook (`use*.ts`)**：
    - 推荐行数 ≤ 250 行，**弹性上限 450 行**。单一关注点；长 Hook（如涉及流式监听、表单操作、撤销回滚多职责）必须按关注点拆解为专注的原子 Hook 并进行二次聚合。


## 4. Zustand 状态管理与 Slice 瘦身 (State Management)
- **C1：异步操作完全剥离**：Slice 仅保留同步状态与 action。所有异步请求（如 API 调用、流式调用）必须提取到独立的聚合 Hook（如 `useXxxActions`）中，通过 `useStore.getState()` 读写状态。
- **C2：禁止 DOM Ref 入库**：DOM 元素（如 `HTMLAudioElement`、`HTMLDivElement`）属于组件内部渲染，严禁存入 Zustand 状态树，应使用 React `useRef` 配合模块级 Setter 管理。
- **C3：细粒度选择器**：在组件中消费 Zustand 时，必须使用 `useStore((s) => s.xxx)` 订阅具体状态，禁止无选择器解构导致整页无效重渲染。
- **C4：强类型校验**：Slice 之间交互时，必须通过 `get()` 调用目标 slice 的公开方法，严禁使用 `as any` 绕过类型安全。

## 5. React 19 并发与 Suspense 规范 (Concurrent Patterns)
- 禁止在组件中直接创建/消费原生 Promise，必须使用封装好的 `useSuspenseQuery` 等 React Query hook。
- 更多 Suspense 与 ErrorBoundary 的最佳实践见 `.agents/skills/frontend-react19-concurrent-patterns/`。

## 6. 前端类型生成与 API 传参防呆 (API & Type Safety)
- **C1**：`@tilo/api-client` 私有制品库是全仓前端数据契约的唯一事实来源（SSOT）。新增与消费 API 数据模型、请求响应类型必须直接从 `@tilo/api-client` 导入，**严禁手写 API 响应 interface，严禁依赖本地旧生成文件**。
- **C2：字段映射**：禁止在 `.tsx` 渲染块中做 `data.snake_case` → UI `camelCase` 的直接字段映射。所有类型转换与映射必须收敛在 `lib/normalize/` 下的纯函数中完成。
- **C3：文件下载传参规范**：在使用生成客户端发起二进制下载时：
  1. 必须在请求参数中传入 `{ format: 'blob' }`（Axios 识别并注入 `responseType: 'blob'`）。**严禁**使用 `responseType: 'blob'`（会被 format 参数覆盖导致失效，使 Axios 默认以 JSON 格式解析导致数据损坏）。
  2. 下载时直接读取 `res.data`（已是 `Blob` 实例），**禁止**对文本响应执行 `new Blob([res.data])` 的二次封装，防止导致 `Overload resolution failed` 及文档损坏。
- **C4：响应解包与集合防御**：
  1. 区分原始 `AxiosResponse<T>`（使用 `res.data as T`）与 UnifiedResponse（使用 `unwrapResponse<T>`），禁止裸调假定包装格式。
  2. 处理列表/集合型 API 响应时，必须执行双向容错解析（`Array.isArray(data) ? data : data?.items || []`），防止后端对象结构与纯数组假定冲突。
- **C5：表单与表格字段 key 契约**：
  1. 必须打开生成类型复制真实字段名，**禁止凭数据库列名或中文直觉臆造 key**。
  2. 表单 `name` 与初始值对象属性必须完全一致，防止抽屉或弹窗打开时预填失效。
  3. **禁止 dual-format 容错蔓延**：禁止为兼容两种命名同时声明两套字段（如 `law_name` + `lawName`）或在 render 中 `record.a ?? record.a_b` 双读；应统一收敛到生成类型字段名。

## 7. 交互状态兜底与状态机 (Interaction Safeguards)
- **C1：列表兜底**：当渲染列表时，必须处理空数组或 `undefined` 的情况并提供兜底 UI（如 `<EmptyState message="暂无数据" />`）。
- **C2：逆向级联逻辑**：在多阶段进度条等逐步进阶的组件中，如果后置阶段被标记为完成，前置阶段也必须在视觉上呈现“已完成”状态（例如，即使中间过程数据为空，最终产出完毕时也应反向级联修正前置状态）。
- **C3：ActionButton Primitive 嵌套禁令**：使用 assistant-ui 或自定义 ActionButton（如 ScrollToBottom、Copy、Send）时，该类组件本身已渲染为 `<button>`，严禁在内部再嵌套 `<button>`（避免触发 HTML `validateDOMNesting` 报错）；自定义元素必须使用 `asChild` 或 render prop。
- **C4：SPA 路由判定尾斜杠归一化**：在判定受控路由（如 `/user/login`）时，必须对 `pathname` 做尾斜杠去除归一化（如 `pathname.replace(/\/+$/, '')`），防止 Nginx 目录 301 重定向（`/user/login/`）导致前端路由判定失效引发登录死循环。
- **C5：Tailwind 语义 Token 注册门禁**：在组件中使用派生语义类（如 `bg-modal-overlay`、`border-ghost-border`）前，必须确认已在 `globals.css` 的 `@theme inline` 声明，Tailwind v4 不会自动生成未注册的任意派生类。
- **C6：全局展示命名空间契约 (Display Namespace Contract)**：页面与组件中所有用户可见文本、按钮文案、Tab 标签、弹窗标题、空态引导与 Toast 提示，必须严格遵守 `design.md §8` 全局用户界面与业务展示命名空间。严禁在 UI 显露“录入/清洗/交付物/物化/沙盒/驾驶舱/影响池/只读冻结/陈旧/沉淀/资产”等技术词；技术标识符（如 `cockpit*`、数据库字段）与 UI 文本必须严格分层。
- **C7：分组列表与表格渲染键（Key）及去重作用域门禁**：在渲染多组分组表格、树形或分区列表时，跟踪已渲染实体的集合（`renderedSet`）或组件 `key` 必须携带父级分组命名空间（如 `${group.groupId}_${item.itemId}`），或直接使用对象引用追踪（`Set<ItemObject>`）。严禁使用无分组作用域的局部条目 ID（如可能由算法模型生成的 `cluster_1` 或分区局部 ID）进行整表跨组去重，杜绝因 ID 碰撞导致跨组的同名合法行被静默跳过或隐藏（178 复盘 G1）。

## 8. Custom Fetch 适配器规范 (Fetch Adapter)
- **C1：禁止直连**：禁止在业务层直接引用 `custom-fetch-adapter.ts`，所有调用必须统一通过 `client.ts` 导出的 `api` 实例。
- **C2：状态码抛错契约**：非 2xx 状态码必须抛出标准的 `AxiosError`（如 `ERR_BAD_REQUEST`/`ERR_BAD_RESPONSE`），保持拦截器与 `extractErrorMessage` 对 `detail`/`message` 正常提取。
- **C3：Signal 与 Timeout 共存**：适配器必须同时支持外部 `signal`（进行请求取消）与 `config.timeout`（覆盖连接建立阶段，fetch 建立后立即清除超时以防误杀长链接）。
- **C4：数组 Query**：数组 query 默认生成 `ids=1&ids=2` 格式以兼容后端列表解析。
- **C5：独立单测**：必须维护独立单测（`custom-fetch-adapter.test.ts`），覆盖超时/取消、401 降级拦截、FormData 头部计算。
- **C6：FormData 必须走 fetch 适配器**：存在两个叠加陷阱，任一命中都会导致 multipart 上传静默失败（后端 422，前端还可能提示成功）：
  1. **全局默认 Content-Type 污染**：严禁在 `axios.create({ headers: { 'Content-Type': ... } })` 中设置根级 Content-Type。axios 会把它写入 `instance.defaults.headers`，污染所有请求；一旦为 `application/json`，`transformRequest` 会把 FormData 按 JSON 序列化（`formDataToJSON` → `{"file":{}}`），**文件内容整体丢失**。axios 对普通对象请求体本就会自动推断 `application/json`，无需全局声明。
  2. **POST/PUT/PATCH 无条件兜底覆盖**：axios >= 1.6 的 `dispatchRequest` 会对 POST/PUT/PATCH 无条件执行 `setContentType('application/x-www-form-urlencoded', false)`，且该操作发生在 `transformRequest` **之后** —— 拦截器与 `transformRequest` 里的任何 `delete('Content-Type')` 都会被覆盖。仅设 `Content-Type: undefined` 已不再有效。
  **正确做法**：FormData 载荷统一经 `HttpClient.request(..., type: ContentType.FormData)` 发出，由 `http-client.ts` 自动切换到 `custom-fetch-adapter`，并在其中**补写**带 boundary 的 `multipart/form-data`（不能只删除）。禁止业务层 `api.instance.post(path, formData, { headers: { 'Content-Type': 'multipart/form-data' } })`。回归用例：`src/lib/api/__tests__/multipart-upload.test.ts`。

## 9. 核心文件顶层注释规范 (Formatting & Comments)
- **文件顶层注释**：核心业务源文件（Hooks、组件、queries、normalize、store）文件顶部（import 前）必须放置统一注释块：
  ```typescript
  /**
   * 模块/Hook 名 — 中文简述
   *
   * 职责：用 1~3 句话描述核心职责与外露接口。
   *
   * 变更说明：
   *   - [YYYY-MM-DD] 原方案 → 新方案 (Zustand 迁移等)
   */
  ```

## 10. 文本常量与 i18n 属性硬编码治理规范 (Text Constants & i18n Governance)
- **C1：命名先查后增**：遇到文案命名或需要从组件抽取字符串时，**必须先检索已有命名的集中目录**（通用/高频词优先检索 `src/lib/i18n/text-constants/global.ts` 与 `shared.ts`；业务领域特定词检索 `src/lib/i18n/text-constants/domain/` 对应文件）。已有命名必须直接导入复用，严禁重新起名造成同义重复。
- **C2：发现硬编码优先对齐已有**：治理组件硬编码（如 JSX 属性 `title`、`placeholder`、`aria-label`、`alt` 中的中文字符串）时，必须优先检索现有常量库并替换为既有常量；仅在既有常量库完全无法覆盖语义时，才允许在对应文件增补新常量并引入。
- **C3：跨 Domain 导出防重门禁 (TS2308 防范)**：`src/lib/i18n/text-constants/domain/index.ts` 采用全量重导出（`export *`）。在 `domain/` 下新增常量时，必须确认其他领域子模块（如 `editor.ts`、`document-share.ts`、`workflow.ts` 等）未导出同名常量，杜绝命名冲突引发 TS 编译报错。

## 11. 状态机按钮微文案与加载态断言约束 (Button Micro-copy & Loading State Testing)
- **C1：文案与规格严格一致**：按钮的正常态与加载态（`isPending` / `isDownloading` / `isLoading`）文案必须在需求规格（spec.md）与实现代码中保持 100% 字符级一致（例如统一为 `打包中` 或 `正在打包...`），严禁实现与规格两端各行其是导致漂移。
- **C2：测试锁定文本与禁用态**：组件单元测试**必须显式断言加载状态下的具体文案变化与 `disabled` 属性锁定**（例如 `expect(btn).toHaveTextContent('打包中')` 且 `expect(btn).toBeDisabled()`），严禁仅使用弱正则（如 `name: /下载/`）模糊带过，确保加载锁生效可测。

## 12. 相关技能 (Related Skills)
- **`frontend-react19-concurrent-patterns`**：并发渲染/Suspense/Error Boundary 模式。
- **`e2e-testing`**：Playwright API mock 和端到端契约回归。

