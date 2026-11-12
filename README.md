# @tilo-ui/content-kit

Tilo 内容渲染与编辑 SDK：Markdown 静态 / 增量（流式）渲染、HTML ⇄ Markdown 转换、Tiptap 表格扩展、Yjs 协同，以及中国法律文书域的内容规则。

- 多入口、按需引入：零 React 的形态判定层、零依赖的法律规则层，可单独使用。
- 统一 Markdown 渲染器：静态渲染与流式（增量）渲染是同一份实现的两种状态。
- HTML ⇄ Markdown 双向转换。
- Tiptap 表格扩展：可持久化列宽 + 工具。
- Yjs 协同装配：隔离撤销栈、awareness。
- 主题 token 契约：后端下发的变量值校验后转为 `--tk-*` 内联 CSS 变量。
- 随包样式 `styles.css`，全部消费 `--tk-*` 变量，宿主可覆盖。

基于 TypeScript，构建产物为 ESM / CJS / 类型声明。License：[MIT](./LICENSE)。

## 安装

```bash
pnpm add @tilo-ui/content-kit@<version>
```

本包发布在私有 registry，消费方需配置对应 scope 的 registry 与凭据（凭据通过环境变量注入，不要写进仓库）：

```ini
# .npmrc
@tilo-ui:registry=<registry-url>
//<registry-host>/:_authToken=${REGISTRY_TOKEN}
```

`<version>` 取已发布版本；可用 `npm view @tilo-ui/content-kit versions` 查询（registry 取自上方配置）。

源码公开托管于 GitHub（见仓库主页），可 fork / 检视；正式安装建议走上方 registry 以拿到构建产物。

## 快速开始

```ts
import * as content from '@tilo-ui/content-kit/content';
import * as markdown from '@tilo-ui/content-kit/markdown';
import { themeStyle } from '@tilo-ui/content-kit/theme';
import '@tilo-ui/content-kit/styles.css';
```

各入口彼此独立，按需引入，避免把用不到的能力拖进构建。

## 入口

| 入口 | 职责 |
| :--- | :--- |
| `/content` | 形态判定（`isHtml` / `isMarkdown` / `isBlockContent`）、HTML 清洗、表格列宽算法；零 React、可 SSR |
| `/convert` | HTML ⇄ Markdown 转换（`ensureHtml` / `htmlToMarkdown` 等）；引入 `marked` + `turndown`，只在真正需要转换处引入 |
| `/legal` | 中国法律文书域规则（文书标题去重、大写数字章节标题、`normalizeLegalMarkdown`）；零依赖 |
| `/markdown` | 统一 Markdown 渲染器：静态与增量（流式）同源 |
| `/tiptap` | Tiptap 扩展基座（可持久化列宽的表格扩展及其工具） |
| `/editor` | `/tiptap` 的过渡别名（`@deprecated`，1.0 移除）；保留只为兼容存量 import |
| `/collab` | Yjs awareness、隔离撤销栈与协同装配工厂；连接、鉴权、房间由宿主注入 |
| `/theme` | 主题 token 契约：`themeStyle()` 把后端下发的变量值校验后转为 `--tk-*` 内联变量 |
| `styles.css` | 随包样式；宿主通过同名 CSS 变量覆盖主题 |

样式只需在应用入口引入一次。具体符号以该入口的实际导出为准（`api/<入口>.api.md` 为机器校验用快照，或 `src/<入口>/index.ts`）。

> **路径更名**：`/editor` 自 0.6.0 起更名为 `/tiptap`。新代码一律使用 `/tiptap`，存量 `import ... from '.../editor'` 仍可短期工作，1.0 移除。

## 主题与样式

- 引入 `styles.css` 一次即可获得正文排版、标题、列表、引用、表格、代码、链接与流式光标样式，全部消费 `--tk-*`。
- 宿主定义同名变量即可换肤；不再需要 Tailwind 或 `@tailwindcss/typography`（`prose` 相关符号已置空并标记 `@deprecated`）。
- 后端规则驱动（动态主题）：

```ts
import { themeStyle } from '@tilo-ui/content-kit/theme';

const { style, rejected } = themeStyle(profile.tokens); // rejected 建议上报
return <article className="tk-content" style={style}>{/* ... */}</article>;
```

只允许覆盖变量值（L1）。结构性差异（letterhead、落款区块等）走 `pickModifiers(profile.modifiers, allowed)` 白名单映射到编译期存在的类，不允许下发布尔任意 CSS 文本。

## Peer 依赖

React、Tiptap / ProseMirror、Yjs、`react-markdown` / `remark-gfm` 由宿主提供，SDK 不打包它们。同一应用内需保证单一版本实例。

| 入口 | 必需 peer | 缺失后果 |
| :--- | :--- | :--- |
| `/content`、`/convert`、`/legal`、`/theme` | 无 | 无（可在 Node / Edge 运行时直接调用） |
| `/markdown` | `react`、`react-markdown`、`remark-gfm` | 运行期解析 `react/jsx-runtime` 失败 |
| `/tiptap` | `@tiptap/core`、`@tiptap/extension-table`、`prosemirror-model`、`prosemirror-state`、`prosemirror-tables` | 扩展构造或插件注入失败 |
| `/collab` | `react`、`yjs`、`y-websocket`、`@tiptap/y-tiptap` | `ySyncPluginKey` 解析失败、撤销隔离失效 |

> `package.json` 无法按入口声明 peer，故 `peerDependenciesMeta` 中全部为 `optional`（仅为让 `/content` 能独立安装）。上表为入口与必需 peer 的对应关系契约。

## 存量代码迁移

不要复制源码，用兼容桥做 re-export，业务侧 import 路径保持不变：

```ts
export { ensureHtml, htmlToMarkdown } from '@tilo-ui/content-kit/content';
```

建议精确列出符号而不是 `export *`，避免 barrel 命名冲突。调用方验证通过后，逐步把业务 import 直接切到 `@tilo-ui/content-kit/<入口>`，稳定后删除桥，杜绝双份实现长期共存。

## 公共 API 与版本

- 公共 API 面由 `api/*.api.md` 快照固守：`pnpm api:check` 失败即代表导出增删或类型签名变更。
- 有意变更时执行 `pnpm api:update`，复核 `git diff api/`，并在 `CHANGELOG.md` 记录。
- 0.x 阶段消费方请精确锁定版本（如 `0.6.0`），不要使用 `^0.x`。

## 本地开发

面向贡献者；不依赖任何宿主业务仓，测试自带独立环境。

```bash
pnpm install
pnpm build
pnpm test
pnpm typecheck
pnpm api:check     # 需先 build；校验公共 API 面与 api/ 快照一致
pnpm api:update    # 有意变更公共 API 后刷新快照
pnpm dev
```

构建按 `exports` 逐入口产出 ESM / CJS / 类型声明并生成样式入口。目录结构与依赖方向：

```text
src/internal/   跨入口共享实现，唯一允许被多个入口共用；不得 import 任何入口
src/content/    内容判定/清洗/表格算法（/content），零转换器
src/convert/    HTML ⇄ Markdown 转换（/convert），唯一引入 marked/turndown 的层
src/legal/      中国法律文书域规则（/legal）
src/markdown/   Markdown 渲染器（/markdown）
src/tiptap/     Tiptap 扩展（/tiptap）；table/ 下为列宽解析与手柄点击
src/collab/     Yjs 协同基座（/collab）；adapter/ 下为产品语义适配器
src/theme/      主题 token 契约（/theme）
src/compat/     更名过渡别名（/editor）
src/styles/     随包样式
tests/          包内回归测试
api/            公共 API 面快照
scripts/        构建与发布脚本
```

依赖方向固定为 `internal ← content/markdown/tiptap/collab ← compat`。新增跨入口共享代码一律进 `internal/`，禁止在入口实现文件中重复定义常量或复制实现。

### 新增导出的准入判据

新符号进入 SDK 前回答三个问题，任一为「否」即留在宿主：

1. 换一个宿主项目仍然成立（不依赖宿主类名、宿主 UI 组件、宿主路由）？
2. 不包含产品枚举（如协同状态机取值；这类差异应通过适配器注入）？
3. 不包含单一业务域的规则（如中国公文标题规则；这类能力将来归 `/legal` 入口）？

## 适用范围

本包聚焦于内容渲染与编辑的共享能力。部分能力带有明确域约束：

- 样式层按 Tilo 设计 token 体系书写（`--tk-*` 契约，宿主可覆盖值，但 token 语义按该体系定义）；
- `/legal` 入口封装中国公文规则，仅对中文公文成立；
- `/collab` 的协同产品态（`thinking` / `rewriting` / `reviewing`、AI 成员等）通过可注入的 `CollabAwarenessAdapter` 解耦，默认实现仅作示例。

复用前请确认上述约束是否与你的系统兼容。

## 能力边界

- 内容 SSOT 是纯文本 Markdown；表格宽度的事实来源是编辑器 AST 的属性，Markdown 不承载宽度。无显式宽度时由 `/content` 按既定算法补默认值。
- 重型业务编辑器（AI、批注、模板、路由状态）留在宿主，复用本包的扩展、样式与协同装配。
- 各入口当前实现了什么以该入口实际导出为准；能力随迭代演进，本文档不锁定清单。

## License

[MIT](./LICENSE)
