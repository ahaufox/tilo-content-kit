/**
 * document-title.ts — 文书总标题去重与公文段落大写标题归一化工具（纯函数）
 *
 * 专案: 188-全栈正则治理源头结构化与防误伤收敛
 * 职责:
 *   1. stripLeadingDocumentTitle: Markdown 源码阶段对文书首行重复 H1 进行归一化严格全等匹配切除；
 *   2. isLegalChapterHeading: 公文大写数字章节标题行级谓词判定。
 */

/**
 * 清洗标题文本用于全等归一化比对（去除书名号、全半角空白与首尾标点）
 */
function normalizeTitleForComparison(raw: string): string {
  return raw
    .trim()
    .replace(/^《\s*/, '')
    .replace(/\s*》$/, '')
    .replace(/[\u3000\s]+/g, '')
    .replace(/^[、，,；;：:。\s]+|[、，,；;：:。\s]+$/g, '');
}

/**
 * 在 Markdown 源码阶段切除首行与文书名严格全等的重复一级标题
 *
 * @param content 文书正文内容
 * @param documentTitle 文书元数据标题（例如「民事起诉状」）
 * @returns 去重后的正文内容（若首行不匹配则原样返回）
 */
export function stripLeadingDocumentTitle(
  content: string,
  documentTitle?: string
): string {
  if (!content || typeof content !== 'string') {
    return content;
  }
  if (!documentTitle || typeof documentTitle !== 'string') {
    return content;
  }

  const cleanDocTitle = normalizeTitleForComparison(documentTitle);
  if (!cleanDocTitle) {
    return content;
  }

  // 1. 处理存量历史资产中由 <div align="center">...</div> 包裹的变体
  const centerDivMatch = content.match(
    /^<div\s+align=["']center["']>\s*\n?#\s*([^\n<]+?)\s*\n?<\/div>\s*(\n+)?/
  );
  if (centerDivMatch) {
    const rawHeadingText = centerDivMatch[1];
    const cleanHeading = normalizeTitleForComparison(rawHeadingText);
    if (cleanHeading === cleanDocTitle) {
      return content.slice(centerDivMatch[0].length);
    }
  }

  // 2. 标准 Markdown 首行一级标题匹配 (^#\s+(.+))
  const standardHeadingMatch = content.match(/^#\s+([^\n]+)(\n+)?/);
  if (standardHeadingMatch) {
    const rawHeadingText = standardHeadingMatch[1];
    const cleanHeading = normalizeTitleForComparison(rawHeadingText);

    // 铁律：严格全等比对，严禁使用包含式匹配 (includes)
    if (cleanHeading === cleanDocTitle) {
      return content.slice(standardHeadingMatch[0].length);
    }
  }

  return content;
}

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
export function isLegalChapterHeading(line: string): boolean {
  const t = line.trim();
  if (!t || t.startsWith('#')) {
    return false;
  }

  // 整行 4~30 字符统一口径
  if (t.length < 4 || t.length > 30) {
    return false;
  }

  const match = /^([一二三四五六七八九十百]{1,3})、(.+)$/.exec(t);
  if (!match) {
    return false;
  }

  const body = match[2].trim();
  if (!body) {
    return false;
  }

  // 排斥句子末尾的断句标点
  if (/[、，,；;：:。]$/.test(body)) {
    return false;
  }

  // 排斥连续序数词（例如「一、二月份公司...」「一、二两项事实...」）
  if (/^[一二三四五六七八九十百]+[、月项两]/.test(body)) {
    return false;
  }

  return true;
}

