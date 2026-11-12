/**
 * 法定文书段落小标题加粗归一化（CNB #562 / #564）
 *
 * 「诉讼请求：」「事实与理由：」独立成行时必须加粗；
 * 已带 Markdown 标题或粗体标记的行保持原样，避免重复包裹。
 */

/** 单行裸小标题：仅匹配标题文字与冒号，不含任何 Markdown 标记 */
const SECTION_HEADING_LINE = /^(诉讼请求|事实与理由)([：:])[^\S\n]*$/;

/** 独立成行的裸小标题（保留行首缩进与行尾水平空白） */
const SECTION_HEADING_WITH_LINE =
  /(^|\n)(?![\t ]*#)(?![\t ]*\*\*)([^\S\n]*)(诉讼请求|事实与理由)([：:])([^\S\n]*)(?=\n|$)/g;

/**
 * 将 Markdown 中独立成行的裸小标题规范化为粗体标记。
 */
export function boldLegalSectionHeadings(markdown: string): string {
  if (!markdown) return '';
  return markdown.replace(
    SECTION_HEADING_WITH_LINE,
    (
      _match: string,
      prefix: string,
      indent: string,
      label: string,
      colon: string,
      trailing: string,
    ) => `${prefix}${indent}**${label}${colon}**${trailing}`,
  );
}

/**
 * 将单行裸小标题直接转换为 `<strong>` HTML。
 * 供不经过 Markdown 预处理的渲染路径（如共享文档预览）复用，无匹配时返回 null。
 */
export function legalSectionHeadingHtml(text: string): string | null {
  const match = SECTION_HEADING_LINE.exec(text.trim());
  return match ? `<strong>${match[1]}${match[2]}</strong>` : null;
}
