# API 快照：@tilo-ui/content-kit/legal

> 自动生成，请勿手改。刷新：`pnpm api:update`。校验：`pnpm api:check`。

<!-- 类型摘要 sha256:ae95541fe2dcfbfc -->

## 运行时导出符号

- `CONTENT_KIT_VERSION`
- `boldLegalSectionHeadings`
- `isLegalChapterHeading`
- `legalSectionHeadingHtml`
- `normalizeLegalMarkdown`
- `stripLeadingDocumentTitle`

## 类型声明（归一化，含本地共享 chunk）

```ts
export { C as CONTENT_KIT_VERSION } from './version.js';

/**
 * document-title.ts — 文书总标题去重与公文段落大写标题归一化工具（纯函数）
 *
 * 专案: 188-全栈正则治理源头结构化与防误伤收敛
 * 职责:
 *   1. stripLeadingDocumentTitle: Markdown 源码阶段对文书首行重复 H1 进行归一化严格全等匹配切除；
 *   2. isLegalChapterHeading: 公文大写数字章节标题行级谓词判定。
 */
/**
 * 在 Markdown 源码阶段切除首行与文书名严格全等的重复一级标题
 *
 * @param content 文书正文内容
 * @param documentTitle 文书元数据标题（例如「民事起诉状」）
 * @returns 去重后的正文内容（若首行不匹配则原样返回）
 */
declare function stripLeadingDocumentTitle(content: string, documentTitle?: string): string;
/**
 * 判断给定行文本是否为合法的公文大写数字章节标题（例如「一、原告基本情况」）
 *
 * 门禁规则（四重防误伤）：
 *   1. 整行非空且首字符非 `#`；
 *   2. 整行长度严格控制在 4 ~ 30 个字符内（统一口径）；
 *   3. 格式为 `^([一二三四五六七八九十百]{1,3})、(.+)$`；
 *   4. 正文主体不以连续序数词（如「二月份」「二两项」）开头；
 *   5. 正文主体末尾不含断句标点（`、，,；;：:。`）。
 *
 * @param line 单行文本
 * @returns boolean
 */
declare function isLegalChapterHeading(line: string): boolean;

/**
 * 法定文书段落小标题加粗归一化（CNB #562 / #564）
 *
 * 「诉讼请求：」「事实与理由：」独立成行时必须加粗；
 * 已带 Markdown 标题或粗体标记的行保持原样，避免重复包裹。
 */
/**
 * 将 Markdown 中独立成行的裸小标题规范化为粗体标记。
 */
declare function boldLegalSectionHeadings(markdown: string): string;
/**
 * 将单行裸小标题直接转换为 `<strong>` HTML。
 * 供不经过 Markdown 预处理的渲染路径（如共享文档预览）复用，无匹配时返回 null。
 */
declare function legalSectionHeadingHtml(text: string): string | null;

/**
 * 规范化法律文书中的 Markdown 标记（修复粗体空格、Setext 标题被误食换行、复合标题与公文大写数字层级）
 */
declare const normalizeLegalMarkdown: (content: string) => string;

export { boldLegalSectionHeadings, isLegalChapterHeading, legalSectionHeadingHtml, normalizeLegalMarkdown, stripLeadingDocumentTitle };
```
