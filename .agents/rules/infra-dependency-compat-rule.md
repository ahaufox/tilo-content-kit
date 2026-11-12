---
trigger: model_decision
description: 前端依赖兼容性规则，包含 pure ESM 模块引入规范及 rehype-raw 兼容问题防范。
globs: "package.json, pnpm-workspace.yaml"
---

# 依赖兼容性规则 (infra-dependency-compat-rule.md)

> **Scope (Globs)**: `["package.json", "pnpm-workspace.yaml"]`

> **适用范围**：在 `frontend-v2` 中引入或升级第三方 npm 依赖时，必须遵守本规则。

---

## 规则 1：`rehype-raw` 严禁在客户端前端中使用

### 问题描述
`rehype-raw`（及其依赖 `hast-util-raw`）为纯 ESM 包（`"type": "module"`），在 Next.js App Router 打包工具处理时其内部动态模块引用链会断裂，导致运行时报错：
```text
Uncaught ReferenceError: rehypeRaw is not defined
```
或构建时报 TypeScript 错误：
```text
error TS2304: Cannot find name 'rehypeRaw'.
```

### 规避方案
```tsx
// ❌ 避免在 Next.js App Router 客户端中使用
import rehypeRaw from 'rehype-raw';
<ReactMarkdown rehypePlugins={[rehypeRaw]} />

// ✅ 正确做法：仅使用 remark 插件，或使用 @streamdown/* 渲染流式 Markdown
<ReactMarkdown remarkPlugins={[remarkGfm]} />
```

### 理由
本项目的法律文档与 AI 对话 Markdown 内容不含原始 HTML 注入标签，`rehype-raw` 的功能完全非必须。如需过滤富文本，应使用 `rehype-sanitize` 或 DOMPurify。

---

## 规则 2：纯 ESM 模块与 Next.js 16 打包兼容性

### 问题描述
部分社区依赖只发布纯 ESM 产物，未提供 CommonJS 兼容导出，在 Next.js 服务端渲染（RSC）与客户端 Hydration 阶段可能引发 `Cannot find module` 或命名导出丢失。

### 建议做法
1. **优先检查 `package.json`**：在 `pnpm add` 新包前，检查其 `exports` 和 `type` 字段是否支持 Node.js 现代模块解析。
2. **Next.js 外部包转译**：如遇到 ESM 包打包解析错误，在 `next.config.ts` 的 `transpilePackages` 中显式添加该包名。
3. **动态导入 (Dynamic Import)**：涉及浏览器专有 API 或大型复杂可视化库（如 `@xyflow/react`、`pdfjs-dist`），使用 `next/dynamic` 并标记 `ssr: false`。

---

## 规则 3：pnpm Overrides 依赖锁定

### 问题描述
深层依赖若引入了存在安全漏洞或与 React 19 不兼容的旧版次级包（如旧版 `dompurify`、`postcss`），会导致构建阶段类型不兼容或安全审计拦截。

### 建议做法
- 在根 `package.json` 中的 `pnpm.overrides` 统一收敛关键安全修复版本。
- 执行 `pnpm install` 后，务必运行 `pnpm typecheck` 与 `pnpm build` 确认依赖解析无冲突。
