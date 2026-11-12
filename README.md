# @tilo-ui/content-kit

> 为 AI Agent 前端而生的内容渲染与编辑 SDK —— 把 SSE 流式 Markdown 渲染、HTML⇄Markdown 转换、Tiptap 表格、Yjs 协同与法律文书规则，做成可复用的开源积木。

[![license](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![types](https://img.shields.io/badge/types-TypeScript-3178c6.svg)](#)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](../../issues)

一套**按需引入、零捆绑**的前端内容能力库：你只取自己要的那一块，其余不会进包。它脱胎于真实的法律文书生产系统，**核心面向 AI Agent 相关前端**——尤其擅长对接后端 SSE 流式输出，边收边渲染，把 token 流实时变成可用内容。核心层与具体产品解耦，也可独立用于任何需要富内容渲染 / 编辑的场景。

## ✨ 特性

- 🧩 **多入口、按需引入**：`/content` `/convert` `/legal` `/markdown` `/tiptap` `/collab` `/theme`，各入口彼此独立。
- 🌊 **SSE 流式 Markdown 渲染**：为 AI Agent 后端的 SSE 输出而生，静态与增量（流式）渲染同源，边收边渲染，零闪烁。
- 🔁 **HTML ⇄ Markdown 双向转换**：`marked` + `turndown` 只在真正需要时引入。
- 📐 **Tiptap 表格扩展**：可持久化列宽 + 工具，不止于默认表格。
- 🤝 **Yjs 协同基座**：隔离撤销栈、awareness；连接与鉴权由宿主注入。
- 🎨 **主题 token 契约**：后端下发变量 → 校验 → 内联为 `--tk-*` CSS 变量，宿主一键换肤。
- ⚖️ **中国法律文书规则**：文书标题去重、大写数字章节标题等（零依赖纯函数层）。
- 🟦 **TypeScript 优先**：ESM / CJS / 类型声明齐备。

## 📦 安装

```bash
pnpm add @tilo-ui/content-kit@<version>
```

> 包发布在公开 registry（CNB 公有源）：`https://npm.cnb.cool/tilo-work/tilo-npm-content-kit/-/packages/`，安装即用，无需私有凭据。源码公开托管于 GitHub，欢迎 fork 与贡献。

React / Tiptap / Yjs 等由宿主提供（`peerDependencies`），SDK 不打包它们——同一应用内需保证单一版本实例。

## 🚀 快速开始

```ts
import * as content from '@tilo-ui/content-kit/content';
import { themeStyle } from '@tilo-ui/content-kit/theme';
import '@tilo-ui/content-kit/styles.css';

// 形态判定 / 清洗 / 表格列宽算法（零 React，可 SSR）
content.isMarkdown(text);

// 动态主题：后端变量 -> --tk-* 内联变量
const { style } = themeStyle(profile.tokens);
```

各入口职责一览：

| 入口 | 负责 |
| --- | --- |
| `/content` | 形态判定、HTML 清洗、表格列宽算法（零 React） |
| `/convert` | HTML ⇄ Markdown 转换 |
| `/legal` | 中国法律文书域规则（零依赖） |
| `/markdown` | 统一 Markdown 渲染（静态 / 流式同源） |
| `/tiptap` | Tiptap 扩展（可持久化列宽表格） |
| `/collab` | Yjs 协同装配（撤销隔离、awareness） |
| `/theme` | 主题 token 契约（`themeStyle()`） |
| `styles.css` | 随包样式，全部消费 `--tk-*`，宿主可覆盖 |

> `/editor` 是 `/tiptap` 的过渡别名（已标记 `@deprecated`，1.0 移除），新代码请用 `/tiptap`。

## 🌊 SSE 流式对接

本 SDK 的核心场景是 **AI Agent 前端**：后端通过 SSE / 流式接口持续推送增量 token，前端用 `StreamingMarkdown` 边收边渲染，无需等整段生成完。

```tsx
import { useState, useEffect } from 'react';
import { StreamingMarkdown } from '@tilo-ui/content-kit/markdown';

// 对接 AI Agent 后端的流式响应，把增量片段累积进 state，流式渲染
function AgentReply({ body }: { body: ReadableStream<Uint8Array> }) {
  const [text, setText] = useState('');
  useEffect(() => {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    (async () => {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        setText(buf);
      }
    })();
    return () => reader.cancel();
  }, [body]);
  return <StreamingMarkdown content={text} />;
}
```

- `StreamingMarkdown` 与静态的 `MarkdownContent` **同源渲染**：共用同一套 remark 插件与主题样式，不会因流式 / 静态切换而样式或行为漂移。
- 业务专属逻辑（引用锚点、法律归一化预处理）由宿主在二者之上叠加，SDK 不内嵌产品规则。

## 🤝 参与开发

我们非常欢迎社区贡献 —— 一行文档、一个示例、一块新能力都算数。

```bash
git clone https://github.com/ahaufox/tilo-content-kit.git
cd tilo-content-kit
pnpm install
pnpm build
pnpm test
pnpm typecheck
```

- 本地预览：`pnpm dev`
- 公共 API 面由 `api/*.api.md` 快照固守，`pnpm api:check` 校验导出是否漂移；有意变更先 `pnpm api:update`。
- 想认领任务？关注仓库 issue（标记 `good first issue` 的更适合起步），或来讨论设计。
- 提交前请阅读 `CONTRIBUTING.md` 与行为准则，保持 PR 小而聚焦。

## 🗺️ 范围

本库聚焦**内容渲染与编辑的共享能力**。部分能力带域约束：样式按 Tilo 设计 token 体系、法律文书规则仅对中文公文成立、协同产品态通过可注入适配器解耦。复用前请确认与你的系统兼容。完整设计见仓库 `src/` 注释与 `api/` 快照。

## 📄 License

[MIT](./LICENSE)
