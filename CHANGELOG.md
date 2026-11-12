# Changelog

本文件记录 `@tilo-ui/content-kit` 对外可见的变更。结构参考 Keep a Changelog，版本遵循 SemVer。

约定：

- 0.x 阶段不承诺向后兼容，但破坏性变更必须走"新增入口 + 旧入口别名"的过渡路径，并在本文件登记移除版本。
- 发布门禁：`scripts/publish-content-kit.sh` 校验当前版本段落存在，缺失即中止发布。
- 公共 API 面的机器可读快照见 `api/*.api.md`（`pnpm api:check` 校验）。

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
