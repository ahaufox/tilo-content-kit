/**
 * preprocess — /markdown 统一渲染器共享的 Markdown 预处理
 *
 * 只做与渲染安全相关的通用规整（表格缺失换行/粘连），不含任何业务语义。
 * 实现位于 src/internal/markdown/table-preprocessor，与 /content 共用同一份定义。
 *
 * 业务预处理（如 citation 事实出处角标）由宿主在调用处叠加，例如：
 *   preprocess: (text) => citationPreprocessor(preprocessMarkdownTable(text))
 */
import { preprocessMarkdownTable } from '../internal/markdown/table-preprocessor';

export { preprocessMarkdownTable };

/**
 * 通用 Markdown 预处理：规整表格后再交给具体宿主叠加业务预处理。
 */
export function preprocessMarkdown(text: string): string {
  return preprocessMarkdownTable(text);
}
