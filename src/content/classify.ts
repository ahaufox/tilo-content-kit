/**
 * content/classify — HTML / Markdown 内容形态判定（纯函数，零依赖）
 *
 * 只回答"这段文本是什么形态"，不做任何转换；转换能力在 /convert。
 * 全部为启发式判定，规则变更需同步 tests/ 中的形态用例。
 */

/**
 * 判断字符串是否包含伪装在简单 HTML (p/div/span) 外壳中的未解析 Markdown 标记
 */
export const containsDisguisedMarkdown = (content: string): boolean => {
  if (!content) return false;
  // 如果已经包含复杂的结构化 HTML 标签（h1-h6, table, ul, ol, blockquote, hr），说明已经是结构化 HTML
  if (/<(h[1-6]|table|thead|tbody|tr|th|td|ul|ol|li|blockquote|pre|hr)\b/i.test(content)) {
    // 除非在段落标签内又混入了未解析的裸块级 Markdown 标记（如 <p># 标题 或 <p>|表格）
    if (/<p[^>]*>\s*(#{1,6}\s+|\|[^\n]+\|)/i.test(content)) {
      return true;
    }
    return false;
  }
  // 仅检查未转义的 Markdown 核心标记语法：标题 (# 标题)、粗体 (**文字**)、表格 (| col |)
  // 不盲目依赖公文大写数字，防止将普通的 <p>一、事实与理由</p> 文本误判为伪装 Markdown
  return /(?:^|>|\n)\s*(?:#{1,6}\s+|\|[^\n]+\|)/m.test(content) ||
    /\*\*[^\*\n]+?\*\*/.test(content);
};

/**
 * 判断字符串是否为 HTML 格式
 */
export const isHtml = (content: string): boolean => {
  if (!content) return false;
  const trimmed = content.trim();
  // 若包含伪装在外壳里的未解析 Markdown 语法，不视为标准纯 HTML
  if (containsDisguisedMarkdown(trimmed)) {
    return false;
  }
  return /<(p|div|br|strong|em|ul|ol|li|h[1-6]|span|a|blockquote|table|thead|tbody|tr|th|td)[\s\S]*>/i.test(trimmed);
};

/**
 * 判断 HTML 或纯文本内容是否实质为空（例如空串、`<p></p>`、`<p data-block-id="..."><br></p>` 等占位结构，
 * 且不包含表格、图片、分割线等非文本结构节点）。
 */
export const isHtmlSubstantivelyEmpty = (content?: string | null): boolean => {
  if (!content) return true;
  const trimmed = content.trim();
  if (!trimmed) return true;
  if (!isHtml(trimmed)) {
    return false;
  }
  if (/<(img|table|hr|iframe)\b/i.test(trimmed)) {
    return false;
  }
  const plainText = trimmed
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/[\u00a0\u200b]/g, '')
    .trim();
  return plainText.length === 0;
};

/**
 * 判断字符串是否包含 Markdown 标记语法
 */
export const isMarkdown = (text: string): boolean => {
  if (!text) return false;
  const patterns = [
    /^#+\s+/m,             // 标题 (# 标题)
    /\*\*.*\*\*/,          // 加粗 (**加粗**)
    /\*.*\*/,              // 斜体 (*斜体*)
    /^\s*[-*+]\s+/m,       // 无序列表 (- 列表)
    /^\s*\d+\.\s+/m,       // 有序列表 (1. 列表)
    /^\s*>\s+/m,           // 引用块 (> 引用)
    /`.*`/,                // 行内代码 (`code`)
    /\[.*\]\(.*\)/,        // 链接 ([link](url))
    /^\s*\|.*\|/m,         // 表格 (| col | col |)
    /```[\s\S]*?```/,      // 代码块
    /~~.+~~/,              // 删除线
    /^\s*[-*_]{3,}\s*$/m,  // 分割线
    /(?:^|\n)\s*[一二三四五六七八九十]+、/,          // 公文二级结构大写标题（一、二、...）
    /(?:^|\n)\s*[（(][一二三四五六七八九十]+[）)]/,  // 公文三级结构括号标题（（一）（二）...）
  ];
  return patterns.some((pattern) => pattern.test(text));
};

/**
 * 别名：保持与历史 detectMarkdown 命名的兼容
 */
export const detectMarkdown = isMarkdown;

/**
 * 判断内容是否包含块级结构（多段落、标题、列表、表格、引用、代码块、块级HTML等）
 */
export const isBlockContent = (content: string): boolean => {
  if (!content) return false;
  const trimmed = content.trim();
  // 1. 包含两个及以上换行（多段落）
  if (/\n\s*\n/.test(trimmed)) return true;
  // 2. 块级 Markdown 标记
  const blockPatterns = [
    /^#{1,6}\s+/m,             // 标题 (# 标题)
    /^\s*[-*+]\s+/m,           // 无序列表 (- 列表)
    /^\s*\d+\.\s+/m,           // 有序列表 (1. 列表)
    /^\s*>\s+/m,               // 引用块 (> 引用)
    /^\s*\|.*\|/m,             // 表格 (| col | col |)
    /```[\s\S]*?```/,          // 代码块
    /^\s*[-*_]{3,}\s*$/m,      // 分割线
  ];
  if (blockPatterns.some((pattern) => pattern.test(trimmed))) {
    return true;
  }
  // 3. 包含块级 HTML 标签
  const innerContent = trimmed.replace(/^\s*<p>([\s\S]*?)<\/p>\s*$/i, '$1');
  const blockHtmlPattern = /<\/?(p|div|ul|ol|li|h[1-6]|blockquote|table|thead|tbody|tr|th|td|pre|hr|section|article)[\s\S]*?>/i;
  return blockHtmlPattern.test(innerContent);
};
