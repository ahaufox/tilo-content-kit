/**
 * /content — 内容形态判定、HTML 清洗、表格排版纯函数入口（零 React）
 *
 * 定位：判定与清洗（`isHtml` / `isMarkdown` / `isBlockContent` / `sanitizeHtml`）
 * 与表格列宽算法。窄体调用方（脚本、Edge 运行时）只需要这些能力。
 *
 * 入口拆分（0.6.0）：
 *   - 转换能力   → `/convert`（marked + turndown）
 *   - 中国公文规则 → `/legal`
 *
 * 过渡策略：0.6.0 期间本入口**继续转发**上述两类符号（标 `@deprecated`），原因是
 * 消费方在制品库中锁定的仍是 0.5.0，而 0.5.0 只有一个 `/content`。若不转发，消费方
 * 要么在 SDK 发布前改代码（CI 必红），要么发布前被迫发一次无人验证的版本。
 * 1.0 移除转发，届时消费方在同一提交内切换到 `/convert`、`/legal`。
 */
export { CONTENT_KIT_VERSION } from '../version';
export * from './classify';
export * from './sanitizeHtml';
export * from './table-layout';

/** @deprecated 0.6.0 起请从 `/convert` 导入；1.0 移除本转发。 */
export {
  ensureHtml,
  ensureInlineHtml,
  ensureSelectionHtml,
  htmlToMarkdown,
} from '../convert/convert';

/** @deprecated 0.6.0 起请从 `/legal` 导入；1.0 移除本转发。 */
export {
  boldLegalSectionHeadings,
  isLegalChapterHeading,
  legalSectionHeadingHtml,
  normalizeLegalMarkdown,
  stripLeadingDocumentTitle,
} from '../legal/index';

/** @deprecated 共享实现位于 src/internal/markdown；新代码请从 `/markdown` 导入。 */
export { remarkHtmlBreaks } from '../internal/markdown/remark-html-breaks';
/** @deprecated 共享实现位于 src/internal/markdown；新代码请从 `/markdown` 导入。 */
export { preprocessMarkdownTable } from '../internal/markdown/table-preprocessor';
