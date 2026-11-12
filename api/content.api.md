# API 快照：@tilo-ui/content-kit/content

> 自动生成，请勿手改。刷新：`pnpm api:update`。校验：`pnpm api:check`。

<!-- 类型摘要 sha256:22844e4896992c03 -->

## 运行时导出符号

- `BASE_MIN_COL_WIDTH_PX`
- `BASE_PADDING_PX`
- `CHAR_WIDTH_UNIT_PX`
- `CONTENT_KIT_VERSION`
- `DEFAULT_TABLE_WIDTH_PX`
- `EXTREME_OUTLIER_RATIO`
- `FIRST_COL_WIDTH_PX`
- `HEADER_WEIGHT_BOOST`
- `INDEX_COL_MAX_WIDTH_PX`
- `INDEX_COL_MIN_WIDTH_PX`
- `INDEX_COL_WIDTH_PX`
- `MAX_COL_RATIO`
- `MAX_SAMPLE_ROWS`
- `TABLE_COMPACT_HEADER_RE`
- `TABLE_INDEX_HEADER_RE`
- `TABLE_LONG_HEADER_RE`
- `analyzeTableColumnDetails`
- `boldLegalSectionHeadings`
- `calculateTableColumnWidths`
- `containsDisguisedMarkdown`
- `detectMarkdown`
- `ensureHtml`
- `ensureInlineHtml`
- `ensureSelectionHtml`
- `getPrintablePageWidthPx`
- `htmlToMarkdown`
- `injectTableWidthsToHtml`
- `isBlockContent`
- `isHtml`
- `isHtmlSubstantivelyEmpty`
- `isLegalChapterHeading`
- `isMarkdown`
- `legalSectionHeadingHtml`
- `measureCellLength`
- `normalizeLegalMarkdown`
- `preprocessMarkdownTable`
- `remarkHtmlBreaks`
- `sanitizeHtml`
- `stripLeadingDocumentTitle`

## 类型声明（归一化，含本地共享 chunk）

```ts
export { C as CONTENT_KIT_VERSION } from './version.js';
export { ensureHtml, ensureInlineHtml, ensureSelectionHtml, htmlToMarkdown } from './convert.js';
export { boldLegalSectionHeadings, isLegalChapterHeading, legalSectionHeadingHtml, normalizeLegalMarkdown, stripLeadingDocumentTitle } from './legal.js';
export { p as preprocessMarkdownTable, r as remarkHtmlBreaks } from './table-preprocessor.js';

/**
 * content/classify — HTML / Markdown 内容形态判定（纯函数，零依赖）
 *
 * 只回答"这段文本是什么形态"，不做任何转换；转换能力在 /convert。
 * 全部为启发式判定，规则变更需同步 tests/ 中的形态用例。
 */
/**
 * 判断字符串是否包含伪装在简单 HTML (p/div/span) 外壳中的未解析 Markdown 标记
 */
declare const containsDisguisedMarkdown: (content: string) => boolean;
/**
 * 判断字符串是否为 HTML 格式
 */
declare const isHtml: (content: string) => boolean;
/**
 * 判断 HTML 或纯文本内容是否实质为空（例如空串、`<p></p>`、`<p data-block-id="..."><br></p>` 等占位结构，
 * 且不包含表格、图片、分割线等非文本结构节点）。
 */
declare const isHtmlSubstantivelyEmpty: (content?: string | null) => boolean;
/**
 * 判断字符串是否包含 Markdown 标记语法
 */
declare const isMarkdown: (text: string) => boolean;
/**
 * 别名：保持与历史 detectMarkdown 命名的兼容
 */
declare const detectMarkdown: (text: string) => boolean;
/**
 * 判断内容是否包含块级结构（多段落、标题、列表、表格、引用、代码块、块级HTML等）
 */
declare const isBlockContent: (content: string) => boolean;

/**
 * sanitizeHtml.ts — 中国法律公文与通用富文本 HTML 安全白名单清洗器
 *
 * 规范与约束：
 *   - 严格遵循白名单机制：仅允许公文与 Markdown 常用排版标签与安全属性；
 *   - 阻断与剥离所有脚本标签（<script>, <style>, <iframe>, <object>, <embed>）；
 *   - 彻底剥离所有内联 on* 事件监听器（如 onerror, onload, onclick）；
 *   - 防御协议注入与 HTML 实体混淆（如 javascript:, vbscript:, data:text/html）；
 *   - 纯函数实现，在 DOMParser (浏览器/JSDOM) 环境优先使用标准 DOM 树遍历，杜绝正则绕过。
 */
/**
 * 对 HTML 片段进行白名单清洗
 *
 * @param dirtyHtml 未经清洗的 HTML 字符串
 * @returns 清洗后符合公文与排版白名单的安全 HTML 字符串
 */
declare function sanitizeHtml(dirtyHtml: string): string;

/**
 * table-layout — 表格列宽智能控制与动态排版算法
 *
 * 职责：
 *   1. 智能识别表头特征（序号列紧凑化固定，保证“序号”二字及 padding 不被强制换行；短元数据列适度紧凑；长文本列弹性分配）。
 *   2. 第一行（表头）加权与防折行保底：当第一行内容长度大于数据行时，重点参考表头（赋予高密度权重），而非被数据行简单平均稀释；
 *      并根据表头字符数动态推导每列的最小安全宽度。
 *   3. 按比例分配并在总宽边界内归一化，输出精确的像素宽度数组，供 Tiptap 和富文本展示使用。
 *
 * 变更说明：
 *   - [2026-08-16] 初始实现：对齐后端 Word 导出表格布局算法，支持智能表头识别、第一行加权与序号紧凑化
 */
declare const TABLE_INDEX_HEADER_RE: RegExp;
declare const TABLE_COMPACT_HEADER_RE: RegExp;
declare const TABLE_LONG_HEADER_RE: RegExp;
/**
 * 动态计算 A4 或指定物理页面在指定 DPI 下的实际可用版心像素宽度
 *
 * @param pageWidthMm 纸张物理宽度（默认 A4 210mm）
 * @param marginLeftMm 左页边距（默认 31.8mm）
 * @param marginRightMm 右页边距（默认 31.8mm）
 * @param dpi 屏幕/渲染分辨率（默认标准 96 DPI）
 */
declare function getPrintablePageWidthPx(pageWidthMm?: number, marginLeftMm?: number, marginRightMm?: number, dpi?: number): number;
declare const DEFAULT_TABLE_WIDTH_PX: number;
declare const INDEX_COL_WIDTH_PX = 48;
declare const INDEX_COL_MIN_WIDTH_PX = 40;
declare const INDEX_COL_MAX_WIDTH_PX = 58;
declare const BASE_MIN_COL_WIDTH_PX = 48;
declare const BASE_PADDING_PX = 14.4;
declare const CHAR_WIDTH_UNIT_PX = 3.072;
declare const FIRST_COL_WIDTH_PX = 105.6;
declare const HEADER_WEIGHT_BOOST = 1.15;
declare const MAX_COL_RATIO = 0.55;
declare const EXTREME_OUTLIER_RATIO = 20;
declare const MAX_SAMPLE_ROWS = 200;
/**
 * 估算单元格的可见字符宽度权重（CJK 字符 = 2.0，ASCII/数字 = 1.0）
 */
declare function measureCellLength(text: string | null | undefined): number;
type ColumnCategory = 'index' | 'compact' | 'long' | 'standard';
interface ColumnAnalysis {
    densities: number[];
    numCols: number;
    minWidths: Record<number, number>;
    colTypes: Record<number, ColumnCategory>;
}
/**
 * 深度分析表格每列的表头特征、数据密度及防折行最小安全宽度
 */
declare function analyzeTableColumnDetails(rows: string[][], totalWidthPx?: number): ColumnAnalysis;
/**
 * 智能计算表格各列的像素宽度（px）
 *
 * @param rows - 单元格二维数组（第一行为表头）
 * @param totalWidthPx - 表格总宽度（默认 A4 版心 553px）
 * @param explicitFixedWidths - 用户或外部显式指定的固定列宽映射 { colIndex: widthPx }
 * @returns 每列像素宽度数组，如 [60, 240, 460]
 */
declare function calculateTableColumnWidths(rows: string[][], totalWidthPx?: number, explicitFixedWidths?: Record<number, number>): number[];
/**
 * 遍历 HTML 字符串中的 <table> 标签，为未显式设置 colwidth 的表格注入智能计算的列宽与 <colgroup>
 *
 * @param html - 待处理的 HTML 字符串
 * @param totalWidthPx - 表格总宽度（默认 A4 版心 553px）
 * @returns 注入列宽属性后的 HTML 字符串
 */
declare function injectTableWidthsToHtml(html: string, totalWidthPx?: number): string;

export { BASE_MIN_COL_WIDTH_PX, BASE_PADDING_PX, CHAR_WIDTH_UNIT_PX, type ColumnAnalysis, type ColumnCategory, DEFAULT_TABLE_WIDTH_PX, EXTREME_OUTLIER_RATIO, FIRST_COL_WIDTH_PX, HEADER_WEIGHT_BOOST, INDEX_COL_MAX_WIDTH_PX, INDEX_COL_MIN_WIDTH_PX, INDEX_COL_WIDTH_PX, MAX_COL_RATIO, MAX_SAMPLE_ROWS, TABLE_COMPACT_HEADER_RE, TABLE_INDEX_HEADER_RE, TABLE_LONG_HEADER_RE, analyzeTableColumnDetails, calculateTableColumnWidths, containsDisguisedMarkdown, detectMarkdown, getPrintablePageWidthPx, injectTableWidthsToHtml, isBlockContent, isHtml, isHtmlSubstantivelyEmpty, isMarkdown, measureCellLength, sanitizeHtml };

export { ensureHtml, ensureInlineHtml, ensureSelectionHtml, htmlToMarkdown } from './chunk.js';
import './chunk.js';
export { CONTENT_KIT_VERSION } from './chunk.js';
//# sourceMappingURL=convert.js.map
//# sourceMappingURL=convert.js.map

import './chunk.js';
export { boldLegalSectionHeadings, isLegalChapterHeading, legalSectionHeadingHtml, normalizeLegalMarkdown, stripLeadingDocumentTitle } from './chunk.js';
export { CONTENT_KIT_VERSION } from './chunk.js';
//# sourceMappingURL=legal.js.map
//# sourceMappingURL=legal.js.map
```
