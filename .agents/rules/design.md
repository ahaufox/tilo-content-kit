---
trigger: model_decision
description: 前端 UI 视觉设计与动效规范，包含 Design Token、排版、暗黑模式、响应式布局及 Framer Motion 动画约束。
globs: "src/components/**/*, src/app/**/*, src/**/*.css, src/**/*.scss"
---

# 前端 UI 视觉设计与动效规范

> **Scope (Globs)**: `["src/components/**/*", "src/app/**/*", "src/**/*.css", "src/**/*.scss"]`

本规范为唯一的 UI 视觉与样式基准。所有 UI 开发必须严格遵循以下硬性约束。

完整设计系统规范、组件定义、Design Token 详情请参见 **`lawtech-design-system`** 技能。

## 1. 核心布局理念
- **编辑式不对称（Editorial Asymmetry）**：通过充足留白与高对比字号层级组织信息。
- **色调分层（Tonal Layering）**：优先使用中性黑白灰微阶梯与充足留白产生纵深，禁止使用 1px 灰线围栏，**严禁使用彩色背景块切分界面**。
- **色彩克制（Color Restraint）**：界面以黑白灰石板色为主基调，彩色仅作为微量点睛（圆点、微图标、细线），严禁色块泛滥与调色盘化。

## 2. Design Token 优先原则（SSOT 以 globals.css 为准）

**严禁在代码中硬编码任何与主题相关的颜色值。** Token 的唯一事实来源是 `src/app/globals.css`（含 `.dark` 覆盖）；`lawtech-design-system` 技能中的旧表可能滞后，**以 globals.css 实际定义为准**。

### 2.1 禁止项
- ❌ 内联样式颜色、Tailwind 原始色阶类（`bg-red-50`、`text-blue-700`、`border-amber-200`、`bg-[#F8F9FA]`、`border-emerald-500`）
- ❌ 严禁在组件代码或需求规格文档（spec.md/plan.md）中手写 Tailwind 原始色阶类；在需求文档中禁止使用情绪化色彩修辞（如“翡翠绿色”、“浅天蓝色”），必须以语义 Token 命名（如 `status-success`、`primary`）作为唯一规范
- ❌ 在状态文字上直接裸用背景色 Token（例如直接写 `text-status-success`，浅色模式下该 Token 对应淡绿底色导致文字对比度不足）；必须使用专用的前景文字 Token（如 `text-status-success-foreground`）
- ❌ 在常规信息展示区大面积铺设彩色背景块（如淡蓝、浅绿、浅粉、浅黄底块）；整行列表项使用彩色背景
- ❌ 在非告警/错误场景下大面积铺设黄色/橙色底块（如 `bg-yellow-soft`、`bg-primary/10`）
- ❌ 滥用彩色药丸胶囊（Pill Badges）密集陈列；并排出现 3 个以上不同色相的标签
- ❌ 在同一视窗内并列出现多个抢夺注意力的彩色实心按钮

### 2.2 推荐项
- ✅ 状态点（微型圆点 + 中性文字）：`<span className="w-1.5 h-1.5 rounded-full bg-status-success" />`
- ✅ 语义状态线框按钮三元组（背景 + 前景文字 + 边框）：`border-status-success-border/40 bg-status-success/10 text-status-success-foreground hover:bg-status-success/20`（暗黑模式由 Token 自动映射，无需手写多套 `dark:` 规则）
- ✅ 极细指示线（卡片左侧或底部 2px 彩色指示条）：`border-l-2 border-primary`
- ✅ 单个视窗仅保留 **一个** 主要行动点（Primary CTA），次要操作均使用幽灵按钮或线框按钮

## 3. 色彩体系与语义映射
- **主品牌色**：荧光黄/金（`--color-primary` / `--v3-yellow`，`#FACC15`），仅用于关键交互焦点、主操作按钮与全局品牌特征
- **表面底色**：
  - 页面背景：`--color-background`（浅色 `#F8F9FA` / 深色 `#0B0F19`）
  - 卡片表面：`--color-surface` / `--surface`（浅色 `#FFFFFF` / 深色 `#111827`）
  - 容器低阶：`--color-surface-container-low` / `--surface-container-low`
  - 容器基础：`--color-surface-container` / `--surface-container`
- **状态语义色**：
  - 成功：`--status-success`
  - 警告：`--status-warning`
  - 危险：`--status-error`
  - 信息：`--status-info`

## 4. 排版系统 (Typography)
- **字体族**：正文使用 Inter / 系统字体，等宽数字与代码使用 JetBrains Mono（详见 `globals.css` `--font-family-*`）。
- **字阶与字重**：严格采用 `--v3-font-*` 与 `--text-*` Token 驱动，避免裸写任意 `text-[13px]` 等非常规字号。

## 5. 响应式布局与高分屏适配
- 核心字号 Token 使用 `rem` 相对单位。
- `globals.css` 已内置 `@media (min-width: 1920px)` / `2560px` / `3840px` 阶梯放大 `html` 根字号，组件无需再写 `2xl:` 字号特判。
- 核心阅读与编辑场景高分屏下必须维持良好字号与行高对比。

## 6. 动效约束
- **优先只动 `transform` 和 `opacity`**：避免对 `width`/`height`/`top`/`left` 做动画（性能与合成层考虑）。
- **列表用 `variants` + `staggerChildren`**：避免手动计算 `transition.delay`。
- **手势用 `whileHover`/`whileTap`**：替代手动状态管理。
- **路由过渡用 `AnimatePresence mode="wait"`**：避免新旧内容重叠闪烁。
- **过渡时长/缓动使用 Token**：`duration-*` / `ease-*` 语义类，禁止硬编码 `cubic-bezier` 或 `transition: all 0.3s`。

## 7. 弹窗与容器圆角规范 (Border Radius Standards)
- **严禁无节制大圆角**：在专业严肃的法律工作台场景中，**严禁使用 `32px` 及以上的大圆角**（如历史遗留的 `rounded-[32px]`）。过大圆角会导致视觉失重、内容裁切与边角留白严重浪费。
- **常规业务弹窗与确认框**（宽度 ≤ 560px，如删除确认、简易表单）：圆角推荐统一采用 `rounded-2xl`（16px）或 `rounded-[20px]`，保持与整体卡片圆角体系协调。
- **工作台级与大视窗弹窗**（`80vw/80vh`、`max-w-3xl` 及以上高占比容器，如案情底稿 `WorkbenchRawInputDialog`、历史版本、证据分析框等）：必须严格限制圆角大小，**强制上限为 `rounded-2xl`（16px）或 `rounded-xl`（12px）**，确保与工作台 1px 发丝细线中性平铺风格浑然一体。
- **卡片与局部块级容器**：统一使用 `rounded-xl`（12px）或 `rounded-2xl`（16px）；内嵌小按钮/输入框使用 `rounded-lg`（8px）~ `rounded-xl`（12px）。

## 8. 全局工具类（globals.css `@utility`，优先复用）

在 `globals.css` 中沉淀的全局工具类，页面开发应优先复用而非内联重复样式：

| 工具类 | 用途 |
|--------|------|
| `btn-interactive` | 标准图标/控制按钮 |
| `btn-icon-ghost` | 次要/幽灵微交互图标按钮（预览控制、缩放操作、迷你工具栏） |
| `btn-icon-border` | 带边框的标准微型操作按钮（如面板头部下载、关闭等） |
| `btn-brand-yellow` | 品牌黄主操作按钮（`px-4 py-1.5 rounded-lg text-xs font-bold` + hover 微缩放） |
| `btn-brand-dark` | 深色辅助操作按钮 |
| `flex-col-center` / `flex-items-center` / `flex-between` | 常用 Flex 布局 |
| `flex-col-overflow-hidden` | 防溢出纵向 flex 容器 |
| `bg-brand-yellow-interactive` | 品牌黄交互背景（hover 变深） |
| `z-sticky` / `z-panel` / `z-modal` | 语义化 Z-Index（禁止裸 `z-10`/`z-999`） |
| `label-caps` / `glass-header` / `dark-gradient-card` | 标签 / 玻璃头 / 深色渐变卡 |

## 9. 用户界面文案与全局展示命名空间规范 (User-Facing Copywriting & Display Namespace)

> **事实来源（SSOT）**：所有面向普通用户的 UI 视图、弹窗、提示文本 (Toast)、按钮与空态文案，必须严格遵守业务展示命名空间。

**核心原则**：**严禁在用户界面使用程序员内部技术术语**。必须站在诉讼律师与司法公文视角，使用自然、直观、专业的业务用词。代码内部标识符（如 `cockpit*`、内部 store 状态、RESTful URL 路径、数据库字段名）保持技术稳定不变，严禁在业务展示层与用户界面显露技术术语。

| 违禁技术词族 (严禁在 UI 显露) | 标准业务用词 (必须使用) | 适用场景示例 |
| :--- | :--- | :--- |
| **原始录入** / **录入数据** / **输入源** | **初始案情** / **案情底稿** | 工具栏按钮、案情原貌弹窗标题、空态引导 |
| **清洗** / **清洗后文本** / **执行清洗** | **整理案情** / **智能整理** | 结构化案情 Tab、整理动作按钮、梳理报告 |
| **交付物** / **产出物** / **输出项** | **办案成果** / **本阶段成果** | 阶段预期成果面板、成果数量统计、交付物卡片 |
| **内部资料** / **内部文档** | **内部底稿** / **过程记录** | 律师自用备忘底稿、流转过程记录 |
| **系统生成材料** | **智能办案文书** | 自动生成的各阶段文书材料分类 Tab |
| **物理物化** / **物化任务** / **落库** | **文书自动生成** / **生成中...** | 文书后台生成进度条、生成状态栏、重新生成按钮 |
| **解析** / **解析结果** / **AI 解析** | **智能分析** / **识别报告** / **分析结果** | 证据识别报告、分析模式选择、核心要素抽取 |
| **强制重跑** / **重跑** / **重新物化** | **重新分析** / **重新生成** | 按钮文案、触发重新处理弹窗与 Toast 消息 |
| **元数据** / **元数据字段** | **文档属性与要素** / **扩展属性** | 文档信息卡片、属性与字段编辑面板 |
| **受限沙盒** / **运行 Python 沙盒** | **执行复杂数理测算** / **安全测算引擎** | AI 辅助速算工具卡片名称与调度标题 |
| **沉淀为资产** / **沉淀** | **保存至办案成果** / **保存** | 速算结果入库按钮、笔记提炼确认保存 |
| **驾驶舱** / **Cockpit** | **案件工作台** / **研判工作台** | 页面 Header、导航面包屑、页面 Title |
| **只读冻结** | **结案 (只读)** | 归档冻结标签、结案提示、归档对话框文案 |
| **陈旧版本** | **历史版本** | 案情更新后的重新生成温和提示横幅 |
| **源码 (JSON)** / **源码模式** | **原始文本** / **原始数据** | 模式切换按钮、编辑器视图分类标签 |
| **格式非合法 JSON** | **输入格式有误** | 文本框或 JSON 校验失败时的 Toast 反馈提示 |

## 10. 红线检查 (Checklist)

提交 UI 变更前逐条核对：

- [ ] 是否完全移除了硬编码的十六进制/RGB 颜色值和 Tailwind 原始色阶类（`bg-red-50`、`text-blue-700`、`border-slate-200` 等）？
- [ ] 是否严守色彩克制，避免在常规文本、元数据、算力预估或次要提示处滥用大面积彩色背景块与彩色药丸胶囊？
- [ ] 辅助元信息（如算力预估、耗时、字数）是否采用了“微型图标 + 中性次级文字”的去色块化纯净排版？
- [ ] 当前视窗或卡片内是否存在与核心主按钮抢夺视觉焦点的横向并列彩色元素？是否已将次要信息垂直降维下沉？
- [ ] 是否杜绝了在非告警/错误场景下大面积铺设黄色/橙色底块（如 `bg-yellow-soft`、`bg-primary/10`）导致的视觉噪音与误判？
- [ ] 是否优先使用了 globals.css 中已注册的语义类（`bg-surface-container-low`、`bg-status-*`、`border-ghost-border`）？
- [ ] 引用的 CSS 变量（`var(--xxx)`）是否在 `globals.css` 亮/暗两套中均已定义？（新增变量必须同时补亮/暗两处 + `@theme inline` 注册）
- [ ] 在暗黑模式下，对比度是否符合阅读标准（无黑底黑字或白底白字）？
- [ ] 在 1280px、1920px 及 2560px (2K) 宽度下，布局与字体大小是否清晰自适应且无错位溢出？
- [ ] 核心字号是否使用了 `rem`/语义 Token，而非固定 `px` 硬编码？
- [ ] 弹窗与容器是否严守圆角限制？工作台级与大视窗弹窗是否受限于 `rounded-2xl`（16px）或 `rounded-xl`（12px），且彻底杜绝了 `rounded-[32px]` 及以上臃肿大圆角？
- [ ] 动画是否仅作用于 `transform` 和 `opacity`？时长/缓动是否用 Token？
- [ ] Z-Index 是否使用语义化类（`z-sticky`/`z-panel`/`z-modal`）？
- [ ] UI 所有文本、按钮与提示是否已严格遵循全局展示命名空间，排除了“录入/清洗/交付物/物化/沙盒/驾驶舱/影响池/冻结/陈旧/沉淀/资产”等技术词？
- [ ] 文件类型徽章是否复用了 `fmtColor`/`fmtChip` 而非自写一套配色？

## 11. 相关技能 (Related Skills)

涉及以下特定场景时，可参考或联动相应技能：

- **`lawtech-design-system`**：设计系统全量规范。当需要查阅底层 Token 体系、组件规范与交互模式时参考（实际可用变量以 `src/app/globals.css` 为准）。
- **`frontend-ui-design`**：界面与视觉设计技能。当设计具体页面、海报或品牌风格，需要产出可运行的前端代码时，在本规则 §1-§6 视觉约束下调用该技能。
- **`impeccable`（网页视觉审查章节）**：视觉审查技能。在 UI 升级、重构或交付前调用，识别 Design Token 缺失、暗黑模式适配、对比度与响应式断裂等视觉回归。

完整技能索引参见 `.agents/skills/README.md`。
