# 使用说明

本文件只讲「怎么用」。包名、版本、导出入口、发布目标、凭据、依赖范围都是会变化的信息，一律以配置或脚本输出为准，不在本文档中复制。

约定：下文 `<pkg>` 指 `package.json` 的 `name`，`<version>` 指要安装或发布的版本；取值方式见第 1 节。

## 1. 事实源：想知道什么，看哪里

| 想知道 | 从哪里取 |
| :--- | :--- |
| 包名 | `node -p "require('./package.json').name"` |
| 当前版本 | `node -p "require('./package.json').version"` |
| 可用入口 | `node -e "console.log(Object.keys(require('./package.json').exports))"` |
| 发布目标 registry | `node -p "require('./package.json').publishConfig.registry"` |
| 发布参数、凭据优先级、执行流程 | `bash scripts/publish-content-kit.sh --help` |
| 依赖与 peer 范围 | `package.json` 的 `dependencies` / `peerDependencies`，入口级必需关系见 2.5 |
| 各入口公共 API | `api/<入口>.api.md`（机器校验用快照），或 `src/<入口>/index.ts` |
| 版本变更内容 | `CHANGELOG.md` |
| 私有源地址与授权 | 制品库页面提供的配置、宿主仓 `.npmrc` |

> `--help` 是发布参数的唯一说明来源：选项、凭据变量、流程与目标地址都由脚本按当前配置动态输出，文档不复述，避免两处漂移。

## 2. 消费方接入

### 2.1 配置私有源

在宿主仓 `.npmrc` 中按制品库页面给出的配置，添加对应 scope 的 registry 与 authToken；凭据通过环境变量注入，不要写进仓库。本包自身不携带 `.npmrc`。CI 与容器构建同样需要注入该凭据，由宿主仓的流水线与镜像构建负责。

### 2.2 安装

```bash
pnpm add <pkg>@<version>
```

版本取制品库中已发布的版本；可用 `npm view <pkg> versions` 查询（registry 取自第 1 节）。

### 2.3 按入口导入

各入口彼此独立，按需引入，避免把用不到的能力拖进构建：

```ts
import * as content from '<pkg>/content';
import * as convert from '<pkg>/convert';
import * as legal from '<pkg>/legal';
import * as markdown from '<pkg>/markdown';
import * as tiptap from '<pkg>/tiptap';
import * as collab from '<pkg>/collab';
import { themeStyle } from '<pkg>/theme';
import '<pkg>/styles.css';
```

具体符号以该入口的实际导出为准（`api/<入口>.api.md`）。入口职责：

| 入口 | 职责 |
| :--- | :--- |
| `/content` | 形态判定（`isHtml` / `isMarkdown` / `isBlockContent`）、HTML 清洗、表格列宽算法；零 React、可 SSR。过渡期（0.6.0）仍转发 `/convert`、`/legal` 的符号，1.0 移除 |
| `/convert` | HTML ⇄ Markdown 转换（`ensureHtml` / `htmlToMarkdown` 等）；引入 `marked` + `turndown`，只在真正需要转换处引入 |
| `/legal` | 中国法律文书域规则（文书标题去重、大写数字章节标题、`normalizeLegalMarkdown`）；零依赖 |
| `/markdown` | 统一 Markdown 渲染器：静态与增量（流式）是同一份实现的两种状态 |
| `/tiptap` | Tiptap 扩展基座（可持久化列宽的表格扩展及其工具） |
| `/editor` | `/tiptap` 的过渡别名（`@deprecated`，1.0 移除）；保留只为宿主零改动迁移 |
| `/collab` | Yjs awareness、隔离撤销栈与协同装配工厂；连接、鉴权、房间由宿主注入 |
| `/theme` | 主题 token 契约：`themeStyle()` 把后端下发的变量值校验后转为 `--tk-*` 内联变量 |
| `styles.css` | 随包样式；宿主通过同名 CSS 变量覆盖主题 |

样式只需在应用入口引入一次。

### 后端规则驱动（动态主题）

```ts
import { themeStyle } from '<pkg>/theme';

const { style, rejected } = themeStyle(profile.tokens); // rejected 建议上报
<article className="tk-content" style={style}>{/* ... */}</article>
```

只允许覆盖变量值（L1）。结构性差异（letterhead、落款区块等）走 `pickModifiers(profile.modifiers, allowed)` 白名单映射到编译期存在的类，不允许下发布尔任意 CSS 文本。契约见 `contracts/styles-tokens.md` §7。

> **路径更名**：`/editor` 自 0.6.0 起更名为 `/tiptap`（原入口实际只含表格扩展，并非编辑器基座）。新代码一律使用 `/tiptap`。

### 2.4 存量代码迁移

不要复制源码，用兼容桥做 re-export，业务侧 import 路径保持不变：

```ts
export { ensureHtml, htmlToMarkdown } from '<pkg>/content';
```

建议精确列出符号而不是 `export *`，避免 barrel 命名冲突。调用方验证通过后，逐步把业务 import 直接切到 `<pkg>/<入口>`，稳定后删除桥，杜绝双份实现长期共存。

### 2.5 单例约束与入口 × 必需 peer

React、Tiptap / ProseMirror、Yjs、Tailwind 等由宿主提供（见 `peerDependencies`），SDK 不打包它们。同一应用内必须保证单一版本实例；宿主仓的 ProseMirror 单例门禁在改动富文本依赖后照常执行。

`package.json` 无法按入口声明 peer，因此入口与必需 peer 的对应关系以本表为契约（`peerDependenciesMeta` 中全部为 `optional`，是为了让 `/content` 能独立安装）：

| 入口 | 必需 peer | 可选 peer | 缺失后果 |
| :--- | :--- | :--- | :--- |
| `/content` | 无 | — | 无（可在 Node / Edge 运行时直接调用） |
| `/convert` | 无 | — | 无（`marked` / `turndown` 由包 dependencies 提供） |
| `/legal` | 无 | — | 无 |
| `/theme` | 无 | — | 无 |
| `/markdown` | `react`、`react-markdown`、`remark-gfm` | — | 运行期解析 `react/jsx-runtime` 失败 |
| `/tiptap` | `@tiptap/core`、`@tiptap/extension-table`、`prosemirror-model`、`prosemirror-state`、`prosemirror-tables` | — | 扩展构造或插件注入失败 |
| `/collab` | `react`、`yjs`、`y-websocket`、`@tiptap/y-tiptap` | — | `ySyncPluginKey` 解析失败、撤销隔离失效 |

### 2.6 公共 API 与版本

- 公共 API 面由 `api/*.api.md` 快照固守：`pnpm api:check` 失败即代表导出增删或类型签名变更。
- 有意变更时执行 `pnpm api:update`，复核 `git diff api/`，并在 `CHANGELOG.md` 记录。
- 0.x 阶段消费方请精确锁定版本（如 `0.6.0`），不要使用 `^0.x`。

## 3. 维护者：本地命令

在包目录执行：

```bash
pnpm install
pnpm build
pnpm test
pnpm typecheck
pnpm api:check     # 需先 build；校验公共 API 面与 api/ 快照一致
pnpm api:update    # 有意变更公共 API 后刷新快照
pnpm dev
pnpm usage
```

`pnpm usage` 等价于 `bash scripts/publish-content-kit.sh --help`（不能用 `pnpm help`，那是包管理器自带命令）。构建按 `exports` 逐入口产出 ESM / CJS / 类型声明并生成样式入口；测试自带独立环境，不依赖任何业务仓的测试设施。

### 目录与依赖方向

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
2. 不包含产品枚举（如协同状态机取值；这类差异应通过适配器注入，见 `docs/00-7待办/04-混合/195-*`）？
3. 不包含单一业务域的规则（如中国公文标题规则；这类能力将来归 `/legal` 入口）？

## 4. 发布

先看帮助，再执行：

```bash
bash scripts/publish-content-kit.sh --help
bash scripts/publish-content-kit.sh                      # 沿用 package.json 当前版本
bash scripts/publish-content-kit.sh --version=<version>  # 指定版本
```

- 脚本自动完成版本解析、CHANGELOG 版本段落门禁、凭据探测、制品库可达性与「同版本已发布」幂等预检，然后执行依赖安装、构建、测试、类型检查与 API 快照校验。
- **CHANGELOG 门禁**：`CHANGELOG.md` 缺少 `## [<当前版本>]` 段落时发布中止；`--version=` 只同步 `package.json` 与 `src/version.ts`，变更说明需人工补写。
- **幂等**：目标版本已存在于制品库时默认跳过（`--force` 强制）。因此 tag 推送不会再因"版本未变"把流水线打红。
- 版本遵循 SemVer 只增不覆盖；凭据只存在于临时文件（包目录之外），进程退出即清理，日志始终脱敏。
- 顶层仓 CI 在 tag 推送时调用同一脚本，无需手工传参；本地与 CI 共用同一份配置源。

## 5. 能力边界

- 内容 SSOT 是纯文本 Markdown；表格宽度的事实来源是编辑器 AST 的属性，Markdown 不承载宽度。无显式宽度时由 `/content` 按既定算法补默认值。
- SSE 连接、chunk 拼接、会话快照比对、完成态消息、鉴权与降级策略留在业务仓；SDK 只接收渲染文本与注入配置。
- 重型业务编辑器（AI、批注、模板、路由状态）留在业务仓，复用本包的扩展、样式与协同装配。
- 各入口当前实现了什么，以该入口实际导出为准；能力随迭代演进，文档不锁定清单。

### 适用范围（重要）

本包是 **Tilo 产品族 + 中国法律文书域** 的共享层，不是通用内容 SDK。三类依赖使它无法直接移植到其他产品：

1. **宿主设计 token**（`--text-main`、`--text-h1`、`--card`、`--tertiary` 等）——样式层按 Tilo 设计体系书写；已改为 `--tk-*` 契约，宿主可覆盖值，但 token 语义仍按 Tilo 定义；
2. **中国公文规则**（`document-title`、`legal-section-headings`、`normalizeLegalMarkdown`）——已隔离到 `/legal`，通用入口不加载；但规则本身只对中文公文成立；
3. **协同产品态**（`thinking` / `rewriting` / `reviewing`、AI 成员概念、块级锁字段）——已改为可注入的 `CollabAwarenessAdapter`，`tiloAwarenessAdapter` 仅作默认值。

复用前请先确认上述三类依赖是否与目标系统兼容；适配方案见 `docs/00-7待办/04-混合/195-tilo-content-kit-契约收敛与复用治理/`。

### 样式接入（方案 B）

- `styles.css` 已自带正文排版、标题、列表、引用、表格、代码、链接与流式光标样式，全部消费 `--tk-*`；宿主定义同名变量即可换肤。
- **不再需要 Tailwind**：包内不产出任何 utility，宿主无需为 SDK 配置 `@source`，也不需要启用 `@tailwindcss/typography`（`prose` 相关符号已置空并标记 `@deprecated`）。
- 若宿主已有 `.legal-document-article` 等自有排版规则，请自行保留；本包不再写入任何宿主类选择器。
