/**
 * table-preprocessor — Markdown 表格防御性预处理共享工具
 *
 * 职责：
 *   - 规整大模型输出或用户粘贴时，表格行与行之间缺少换行符导致粘连的异常（如 '| |---|' 或 '||'）；
 *   - 规整表格前后与普通文本缺少空行隔离导致的 Markdown 解析退化，符合 CommonMark/GFM 规范；
 *   - 规范化表格单元格内变体换行标签（如 <br >、<br/>、&lt;br&gt;），便于后续 AST 解析器稳定消费；
 *   - 作为 assistant-ui (markdown-text) 与 ai-elements (x-markdown) 的共享底层工具，消除横向耦合。
 */

/**
 * 防御性预处理函数：规整 Markdown 表格缺失换行符/粘连异常及单元格换行标签
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

  // 4. 规范化表格行内的各类变体换行标签（如 <br >、&lt;br&gt;、<br/> 等），规整为标准 <br>
  // 仅在包含管道符的表格行中执行替换，避免波及普通行或行外代码
  result = result.replace(/^(\|.+)$/gm, (line) => {
    // 保护行内代码块 `...`
    const inlineCodes: string[] = [];
    const masked = line.replace(/`[^`\n]+`/g, (m) => {
      inlineCodes.push(m);
      return `__TABLE_INLINE_CODE_${inlineCodes.length - 1}__`;
    });

    const normalized = masked
      .replace(/&lt;(?:\/|\s*)?br\s*\/?&gt;/gi, '<br>')
      .replace(/<(?:br(?:\s+[^>]*)?\/?>|\/\s*br>)/gi, '<br>');

    return normalized.replace(/__TABLE_INLINE_CODE_(\d+)__/g, (_, idx) => inlineCodes[Number(idx)] || '');
  });

  return result;
}
