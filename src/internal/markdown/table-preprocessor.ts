/**
 * table-preprocessor — Markdown 表格防御性预处理共享工具
 *
 * 职责：
 *   - 规整大模型输出或用户粘贴时，表格行与行之间缺少换行符导致粘连的异常（如 '| |---|' 或 '||'）；
 *   - 规整表格前后与普通文本缺少空行隔离导致的 Markdown 解析退化，符合 CommonMark/GFM 规范；
 *   - 作为 assistant-ui (markdown-text) 与 ai-elements (x-markdown) 的共享底层工具，消除横向耦合。
 */

/**
 * 防御性预处理函数：规整 Markdown 表格缺失换行符/粘连异常
 *
 * @param text 待处理的 Markdown 原文本
 * @returns 规整换行与空行后的 Markdown 文本
 */
export function preprocessMarkdownTable(text: string): string {
  if (!text || typeof text !== 'string') return text;
  let result = text;

  // 1. 修复粘连表格行：当行尾管道符与下一行行首管道符粘连（"| |" 或 "||"），识别并补充换行符 "\n|"
  const tableRowGlueRegex = /\|\s*\|(?=\s*(?:[-:]{2,}|[^\n|]+)\s*\|)/g;
  result = result.replace(tableRowGlueRegex, '|\n|');

  // 2. 确保表格开头行之前（非表格行）且紧挨着文本时，补充空行以符合块级隔离规范
  result = result.replace(/([^\n|])\n(\|(?:\s*[^|\n]+\s*\|)+)/g, '$1\n\n$2');

  // 3. 确保表格结尾行之后（紧挨着普通文本）时，补充空行
  result = result.replace(/(\|(?:\s*[^|\n]+\s*\|)+)\n([^\n|])/g, '$1\n\n$2');

  return result;
}
