/**
 * /convert — Markdown ↔ HTML 转换入口
 *
 * 依赖说明：本入口引入 `marked` 与 `turndown`（包 dependencies），因此只应在真正
 * 需要转换的调用点引入；仅做判定/清洗的代码请使用 `/content`。
 */
export { CONTENT_KIT_VERSION } from '../version';
export {
  ensureHtml,
  ensureInlineHtml,
  ensureSelectionHtml,
  htmlToMarkdown,
} from './convert';
