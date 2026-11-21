# Changelog

本文件记录 `@tilo-ui/content-kit` 对外可见的变更。结构参考 Keep a Changelog，版本遵循 SemVer。

约定：

- 0.x 阶段不承诺向后兼容，但破坏性变更必须走"新增入口 + 旧入口别名"的过渡路径，并在本文件登记移除版本。
- 发布门禁：`scripts/publish-content-kit.sh` 校验当前版本段落存在，缺失即中止发布。
- 公共 API 面的机器可读快照见 `api/*.api.md`（`pnpm api:check` 校验）。

## [0.6.4] - 2026-11-21

### 新增与优化

- **通用富文本编辑器能力下沉与表格上下文气泡菜单（`TableBubbleMenu` / `RichEditor`）**：
  - 新增 `TableBubbleMenu` 表格浮动上下文菜单：内置原生 SVG 图标（上插行、下插行、删行、左插列、右插列、删列、删表），支持光标进入表格单元格时自适应浮出，消费随包 `--tk-*` 设计变量；
  - `RichEditor` 支持参考开关 `showTableBubbleMenu?: boolean`（默认 `true`），调用方可自由配置开启或彻底关断气泡菜单；
  - `RichEditor` 扩展高度排版模式（`heightMode: 'full' | 'auto' | 'fixed'` 与 `minHeight`），支持弹性撑满父容器与自适应高度切换；
  - `RichEditor` 扩展 `isDragging` 拖拽高亮态感知与 `renderHiddenTextarea` 无障碍表单桥接；
  - 外层容器挂载 DOM `value` 存取器描述符，保障单测 `fireEvent.change` 与原生表单直接驱动；
  - 导出对齐：`/editor` 与 `/tiptap` 双入口同步导出 `TableBubbleMenu` 及相关契约类型；
  - Demo 页面同步更新：新增表格气泡菜单开关（开启/关闭）交互演示与代码示例。

### 修复

- **富文本基座只读态、底栏统计、高度模式、样式特异性、DOM 赋值与交互加固（`RichEditor` / `styles`）**：
  - **只读态交互修复 (B1)**：移除 `.tk-editor-box--disabled` 的 `opacity: 0.65; pointer-events: none;`，改为 `cursor: default` 并对内部编辑区保留 `cursor: text; user-select: text;`，使只读态/预览渲染器文本仍可正常高亮选中、复制与滚动；
  - **底栏与字数统计口径与门控 (H1 / N2)**：`RichEditorProps` 补齐 `tipsText?: string;`，在 `showFooter=true` 且未提供自定义 `renderFooter` 时，默认渲染左侧 `tipsText` 与右侧 `{charCount} 字`（带 `data-testid` 守卫）；首屏字数统一基于纯文本计算，且在 `showFooter=false` 时完全关闭字数统计避免无谓重渲染；
  - **固定高度模型落地 (H2)**：落地 `heightMode="fixed"` 对应的 `.tk-editor-box--fixed` 与 `.tk-editor-area--fixed`，内联注入 `height: minHeightStyle; overflowY: 'auto'`，杜绝退化为默认样式；
  - **CSS 特异性全面降级 (W6)**：将 `.tk-content` / `.tk-editor-content` 的默认排版标签规则（含标题、段落、列表、表格、代码块及链接）全面收敛至 `:where(.tk-content, .tk-editor-content)`，将选择器特异性降至 `(0, 0, 1)`，使宿主 Tailwind prose 样式（如 `prose-h1:text-xl` 即 `(0, 1, 0)`）能够精准覆盖，解决样式优先级倒置；
  - **DOM value 存取器单次分发、实时 getter 与桥接直通 (W1 / N3 / N4)**：拦截初次挂载时内部无操作的 `onUpdate` 触发（首发静默）；`setter` 显式关断内部 update，由统一出口单次下发清洗后的 Markdown；隐藏 textarea 保持原生 Markdown 直通分发（杜绝 Turndown 破坏性断行）；`setter` 与隐藏 textarea 统一同步触发 `onChangeHtml`；`getter` 实时动态计算 Markdown；
  - **空白区聚焦与占位符匹配 (S1 / S4)**：在 `.tk-editor-area` 空白区点击时自动触发编辑器聚焦；修正占位符选择器匹配规则为 `:where(.tk-editor-content).ProseMirror p.is-editor-empty:first-child::before`。
- **公文归一化幂等性与表格结构保护（`normalizeLegalMarkdown`）**：
  - 紧凑列表拆分正则由 `([；;。]\s*)` 收敛为 `([；;。])[ \t]*`：分隔符后只吃行内空格，不再吞掉已有换行，对已归一化文本重复执行不再在列表项之间多插一个空行（A→B→C 恒等）；
  - 对齐容器归一化抽离为独立模块 `legal/align-containers.ts`：按同标签嵌套计数定位闭合标签，最外层优先、内层递归处理，嵌套 `<div><p>…</p></div>` 的 `</div>` 后补齐独立空行；
  - 表格单元格（`<td>/<th>`）深度跟踪：单元格内部的对齐容器原样保留，严禁产生破坏性断行（`<td><p align="center">…</p></td>` 不再被拆成多行）；
  - 无配对闭合标签的残缺对齐容器原样保留，不再被误伤丢弃。

## [0.6.3] - 2026-11-14

### 新增与优化

- **纯净通用富文本编辑器与格式工具栏（`EditorToolbar` / `RichEditor` / `ColorPicker`）正式发布**：
  - 正式发布 `EditorToolbar`、`RichEditor` 与 `ColorPicker` 导出，提供零外部依赖的原生 SVG 格式化工具栏与色板；
  - 调优富文本工具栏尺寸与轻量加粗样式（32px 按钮与 44px 工具栏规范），完善 Tiptap ^3.34.0 依赖兼容性；
  - 双入口统一导出：`/editor` 与 `/tiptap` 均支持导入 `EditorToolbar`、`EditorToolbarProps`、`ColorOption` 等核心组件与类型；
  - 引入源码指纹比对机制（`content-kit-fingerprint.mjs`）与 `--skip-unchanged-contract` 支持，彻底防范同版本已存在跳过导致的未发雷区。

## [0.6.2] - 2026-11-14

### 新增

- **纯净通用富文本编辑器与格式工具栏（`EditorToolbar` / `RichEditor` / `ColorPicker`）**：
  - 新增 `EditorToolbar`：零外部 UI 框架与图标库依赖（纯原生内联 SVG），支持基础排版、标题 H1–H3、左中右对齐、列表、引用块、表格行列表格操作、水平分割线与撤销重做；
  - 核心补齐**文字颜色（`IconPalette`）与文本高亮（`IconHighlighter`）**：原生内置 `ColorPicker` 纯 DOM 浮层与色板，支持警示鲜红（`#ef4444`）等常用色与清除重置，与 `colorSpan` 往返转换形成技术闭环；
  - **工具栏超宽自适应与响应式排版**：
    - 默认单行滚动模式（`multiline=false`）：格式按钮区（`tk-toolbar-scroll-container`）支持极细（3px）平滑横向滚动与触摸滑动，右侧业务插槽 `extraActions` 吸附常驻（sticky 绝不被滚出视口）；
    - 语义组自动折行模式（`multiline=true`）：按语义化按钮组（`tk-toolbar-group`）整组折行，组内紧凑互保，彻底杜绝单按钮破碎换行；
    - `RichEditor` 支持 `multilineToolbar?: boolean` 透传。
  - 新增 `RichEditor`：开箱即用的受控 Markdown/HTML 所见即所得富文本编辑器基座，内置更新互斥锁与实质差异比对，杜绝受控光标跳动与死循环更新，支持 Ctrl+S 与 Esc 快捷键拦截；
  - 样式完全消费随包 `styles.css` 与 `--tk-*` 设计 Token，零 Tailwind 强绑定，自适应浅深色主题；
  - 双入口统一导出：在 `/editor` 与 `/tiptap` 下同时导出 `RichEditor`、`EditorToolbar`、`ColorPicker`、`createDefaultEditorExtensions` 等。

## [0.6.1] - 2026-11-13

### 修复

- **表格列宽手柄轻点事件捕获前移（`tiptap/table/handle-click.ts`）**：
  - 将目标解析 `resolveHandleTarget` 前移至 `onMouseDown` 捕获期执行，把解析出的 `detail`、起始坐标与时间暂存到闭包中，彻底解决 `prosemirror-tables` 内部重建手柄 DOM 导致 `onMouseUp` 反查目标脱离文档、`TABLE_COLUMN_CLICK_EVENT` 永不派发的问题；
  - `onMouseUp` 仅做位移与耗时判定（<5px 且 <400ms 派发事件，超出交回拖拽）；
  - 插件 `destroy()` 补充对 `mouseup` 监听注销清理；
  - 新增 `tests/table-handle-click.spec.ts` 行为测试与核心断点回归探针。
- **随包 CSS token 消费契约修复（`styles.css`）**：
  - token 缺省声明从内容元素上移到 `:root, :host`，避免元素自身声明遮蔽 `themeStyle()` 在祖先容器注入的运行时主题（Shadow DOM 场景由 `:host` 接管）。
  - 补齐白名单死键的真实消费点：`font-family-body` / `font-family-heading`（替换旧名 `--tk-font-body`，正文与 h1–h6 分别消费，旧键无源码级消费方）；`page-padding-x` / `page-padding-y`（`.tk-content` 版心 `padding`，缺省 0 外观不变，`letterhead` 预设变体继续优先）；`table-border`（表格 5 处 color-mix 边框基色，缺省与 `--tk-border` 一致外观不变）。
  - `surface-low` 补入白名单（表头底 / 隔行底混合基色）。
  - `tests/theme.spec.ts` 新增防死键门禁：`THEME_TOKENS` 全键必须存在 `var(--tk-*)` 真实消费点，缺省声明不再被误判为消费。
- **黄金夹具本仓化**：`theme-document-template.spec.ts` 改读本仓 `tests/assets/document_style_profile.golden.json`（与 tilo-export 侧 `tests/fixtures/` 逐字节一致），消除对兄弟仓检出的隐式依赖（独立 clone 时模块顶层 `readFileSync` 无守卫会导致整套测试崩溃）；跨语言同构门禁保持全量 4 用例不弱化。

## [0.6.0] - 2026-11-11

### 新增

- 新增 `/tiptap` 入口：原 `/editor` 更名（该入口实际只含 Tiptap 表格扩展，并非编辑器基座）。`/editor` 保留为 `export *` 过渡别名，标记 `@deprecated`，1.0 移除。
- 新增 `/convert` 入口（`ensureHtml` / `ensureInlineHtml` / `ensureSelectionHtml` / `htmlToMarkdown`）：`marked` + `turndown` 的重依赖集中于此。
- 新增 `/legal` 入口（`stripLeadingDocumentTitle` / `isLegalChapterHeading` / `boldLegalSectionHeadings` / `legalSectionHeadingHtml` / `normalizeLegalMarkdown`）：中国法律文书域规则。
- 新增 `/theme` 入口：`parseDocumentStyleProfile` / `applyProfile` / `profileFingerprint` 把样式档校验、L1+L2 装配与缓存指纹串成一次调用（前端契约层）；`themeStyle(tokens)` 按白名单与值正则把后端下发的 token 转成 `--tk-*` 内联变量；`profileFromDocumentTemplate(settings)` 把后端 `DocumentTemplateSettingsResponse` 归一化为规则档（与 `tilo_export.profile_from_template_settings` 共用一份 golden fixture，保证屏幕与导出同源）；`pickModifiers(modifiers, allowed)` 做 L2 变体白名单过滤；`DEFAULT_MODIFIERS` + `modifierClassNames()` 把后端下发的变体 id 映射为编译期存在的 class（`compact` / `letterhead`）；`THEME_TOKENS` 为 token 契约的代码侧 SSOT。
- 新增表格列宽前后端一致性基准：`tests/fixtures/table-layout.parity.json` 由后端 `tilo_export.docx_table_layout` 生成（6 个用例），`tests/table-layout-parity.spec.ts` 校验 TS 与后端偏差；其中 2 个用例标记为已知漂移（`aligned=false`），收敛算法后需重新生成并翻转标记。
- 协同新增 `CollabAwarenessAdapter` 接口与 `tiloAwarenessAdapter` 默认实现：AI 判定、状态归一化、块级锁解析、超时阈值均可注入；`useCollabMembers<TState>` / `useBlockLocks` 接受 `adapter` 选项，宿主零改动即为原语义。
- 新增 `scripts/api-report.mjs` 与 `api/*.api.md`：按入口生成归一化 `.d.ts` 快照（含共享 chunk），`pnpm api:check` 在发布链路中阻断非预期公共面变更。
- 新增 `src/internal/` 内部层：`AGENT_ORIGIN`、`USER_TABLE_RESIZE_ORIGIN`、`PATCHED_SYMBOL` 与 remark 插件、表格预处理统一在此定义，各入口仅 re-export。
- 包内新增 Tiptap 扩展、协同 Hook 与 theme 的回归测试（自消费方仓库迁入并改写导入），测试总数 54 → 115。
- `exports` 增加 `./package.json`，便于工具链读取元数据。
- `/markdown` 组件根节点挂 `.tk-content` 主题作用域；`styles.css` 补齐表格、代码、链接、流式光标与正文排版基线的 token 化样式。
- **表格列宽算法对齐后端 SSOT（行为变更）**：`analyzeTableColumnDetails` 的密度公式、最小安全宽常量、首列收敛目标逐项移植自 `tilo_export.docx_table_layout`。修掉 T024 记录的两处漂移（两列短文本 16.7px、五列混合 34.3px），6 个基准用例现全部偏差 ≤ 1px。**影响：未显式指定 `colwidth` 的表格，编辑态默认列宽会变化**（目的是与 Word 导出一致）；已保存文档的显式列宽不受影响。
- **样式方案 B 完成（S2/S3）**：`components.tsx` 不再输出任何 Tailwind utility（只保留表格滚动容器、代码块结构与链接安全属性三处必要的 DOM 改写），排版与配色全部由随包 CSS 承担；`MARKDOWN_PROSE_CLASSES` 与 `defaultMarkdownClassName` 置空并标记 `@deprecated`（符号保留，宿主 import 不断）。

### 变更

- `/content` 在 0.6.0 期间**继续转发** `/convert` 与 `/legal` 的符号（均标 `@deprecated`），1.0 移除。原因：消费方在制品库中锁定的仍是 0.5.0，而 0.5.0 只有 `/content` 一个内容入口；若 0.6.0 直接移除转发，消费方只能在「SDK 发布前改代码（CI 必红）」与「发布一个没人验证过的版本」之间二选一。代价是 `/content` 的模块图仍包含 `marked`/`turndown`，包体收益推迟到 1.0；迁移步骤见 T025。
- `ResizableTable` 拆分为 `tiptap/ResizableTable.ts`（扩展与插件装配）+ `tiptap/table/colwidth.ts`（列宽解析）+ `tiptap/table/handle-click.ts`（手柄点击），单文件 525 行 → 277 行。
- `useCollabMembers` 瘦身：状态/锁/超时逻辑移入适配器，Hook 只保留订阅、去抖与巡检。
- 构建开启 `splitting`：各入口不再各自内联一份共享实现（remark 插件、版本常量、分类函数）。
- `README` 增加"入口 × 必需 peer"契约表、目录与依赖方向、API 快照与 CHANGELOG 维护流程、适用范围声明。

- **运维变更（不影响包内容）**：CNB npm 制品仓库由 `tilo-content-kit` 改名为 `tilo-npm-content-kit`（git 仓库占用原名），历史版本 0.1.0–0.6.0 全部保留。发布目标与消费侧坐标统一由主仓 `CONTENT_KIT_NPM_REPO` / `CONTENT_KIT_VERSION` 约定，经 `scripts/sdk/sync-content-kit.sh` 派生同步到 `publishConfig`、各前端仓 `.npmrc`、CI/Docker 与 lockfile；不再逐处硬编码仓库名。
### 修复

- `/markdown` 默认主题移除非法 utility `prose-p:text-[var(--text-base)]`：`--text-base` 是字号 token，生成的 `color` 声明无效，且与 `prose-p:text-[var(--text-body)]` 同属性冲突。
- 随包样式移除宿主专属选择器（`.legal-document-article`）与无条件的 `.tk-editor .ProseMirror { width:100% !important }`；版心覆盖改为显式开关 `.tk-editor--flush-width`。
- 发布脚本改为幂等：当前版本已存在于制品库时跳过发布（此前去重依赖本地 `.publish-state`，CI 沙箱中不存在，tag 推送必然以 409 失败）；`--force` 仍可强制。
- 发布脚本不再向包目录写入/删除 `.npmrc`，避免覆盖开发者本地配置；CHANGELOG 缺失当前版本段落时中止发布且不修改任何文件。
- 发布脚本的临时凭据键改为 registry **完整路径**（`//host/<repo>/-/packages/:_authToken`）：CNB 私有源按路径前缀匹配，原先只写 `//host/` 时 `npm view` 可匿名读通但 `npm publish` 报 `ENEEDAUTH`；同时在发布前新增 `npm whoami` 写权限预检，避免构建全跑完才在上传处失败。

### 移除

- 运行时依赖 `clsx`、`tailwind-merge`（包内无引用）。
- peer 依赖 `@ant-design/x-markdown`、`shiki`、`mermaid`、`y-protocols`、`@tiptap/pm`、`@tiptap/react`、`prosemirror-view`、`prosemirror-transform`、`react-dom`（均未被包内 `dist` import）。
- peer 依赖 `tailwindcss`、`@tailwindcss/typography`（S3 完成：包内不再产出台风 utility，宿主无需为 SDK 配置 `@source` 或启用 typography 插件）。

## [0.5.0] - 2026-11-11

### 新增

- 上收 Yjs 协同基座至 `/collab`：`useIsolatedUndoManagers`、`useUndoManagerStatus`、`patchYjsOriginSync`、`useBlockLocks`、`useCollabMembers`、`computeMembers`。宿主 `@/lib/yjs` 改为 re-export 桥。

## [0.4.0] - 2026-11-11

### 新增

- 上收可持久化列宽的 Tiptap 表格扩展至 `/editor`：`ResizableTable`、`ResizableTableCell`、`ResizableTableHeader`、`resolveHandleTarget`、`TABLE_COLUMN_CLICK_EVENT`、`USER_TABLE_RESIZE_ORIGIN`。

## [0.3.1] - 2026-11-11

### 变更

- 接入私有制品库发布流水线，补充凭据探测与可达性预检。

## [0.3.0] 及更早

早期版本未在仓库内留档。可考事实：0.1.0–0.3.0 为入口骨架、内容转换（`ensureHtml` / `htmlToMarkdown` / `sanitizeHtml` / 表格列宽算法）与 Markdown 渲染器（`MarkdownContent` / `StreamingMarkdown` / 默认组件映射）的分批上收。
