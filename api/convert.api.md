# API 快照：@tilo-ui/content-kit/convert

> 自动生成，请勿手改。刷新：`pnpm api:update`。校验：`pnpm api:check`。

<!-- 类型摘要 sha256:23ad685efda612d1 -->

## 运行时导出符号

- `CONTENT_KIT_VERSION`
- `ensureHtml`
- `ensureInlineHtml`
- `ensureSelectionHtml`
- `htmlToMarkdown`

## 类型声明（归一化，含本地共享 chunk）

```ts
export { C as CONTENT_KIT_VERSION } from './version.js';

/**
 * 强制确保内容为合法 HTML 格式（Markdown 自动解析为 HTML）
 */
declare const ensureHtml: (content: string) => string;
/**
 * 将内容转换为行内 HTML 格式（不包裹 <p> 块级标签，避免选区插入时造成意外断行）
 */
declare const ensureInlineHtml: (content: string) => string;
/**
 * 为选区替换准备 HTML 内容：
 * - 当 isInline 为 true 且内容不包含块级结构时，返回行内 HTML（避免破坏当前段落导致换行）
 * - 否则返回标准块级 HTML（ensureHtml）
 */
declare const ensureSelectionHtml: (content: string, isInline?: boolean) => string;
/**
 * 将 HTML 字符串转换为清洗后的标准 Markdown 字符串
 */
declare const htmlToMarkdown: (html: string) => string;

export { ensureHtml, ensureInlineHtml, ensureSelectionHtml, htmlToMarkdown };
```
