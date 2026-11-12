/**
 * legal/normalize — 中国法律文书 Markdown 归一化（纯函数，零依赖）
 *
 * 职责边界：只处理公文书写习惯带来的 Markdown 解析问题（段落小标题加粗、
 * 大写数字层级标题、对齐容器脱壳、Setext 标题误判等），不做任何 HTML 渲染。
 *
 * 域约束：本文件属于中国法律文书域，与"通用内容能力"分属不同入口（/legal）。
 */
import { boldLegalSectionHeadings } from './legal-section-headings';
import { isLegalChapterHeading } from './document-title';

/**
 * 规范化法律文书中的 Markdown 标记（修复粗体空格、Setext 标题被误食换行、复合标题与公文大写数字层级）
 */
export const normalizeLegalMarkdown = (content: string): string => {
  if (!content) return '';
  let text = content.trim();

  // 若被 HTML 外壳（单段落或多段落 <p...>、<div...>）误包裹但本质是 Markdown，脱去外壳。
  // 带 align 排版属性或 text-align 样式的容器属于公文排版资产（标题居中/落款右对齐），先以占位符保护，
  // 脱壳后再恢复，杜绝无差别全局替换把居中/右对齐容器抹杀。
  if (/<(p|div)[^>]*>[\s\S]*<\/\1>/i.test(text)) {
    const alignContainers: string[] = [];
    const protectedText = text.replace(
      /<(p|div)\b[^>]*(?:\balign\s*=|style\s*=\s*['"][^'"]*text-align)[^>]*>[\s\S]*?<\/\1>/gi,
      (match) => {
        const idx = alignContainers.length;
        alignContainers.push(match);
        return `\u0000ALIGN_${idx}\u0000`;
      },
    );
    const unpacket = protectedText
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>\s*<p[^>]*>/gi, '\n\n')
      .replace(/<\/?(p|div)[^>]*>/gi, '');
    const restored = unpacket.replace(/\u0000ALIGN_(\d+)\u0000/g, (_m, i) => alignContainers[Number(i)]);
    if (/(^|\n)(#{1,6}\s+|\|.+?\||\*\*|[一二三四五六七八九十]+、)/.test(restored) || /^#{1,6}\s+/.test(restored)) {
      text = restored.trim();
    }
  }

  // 确保 <div align="..."> 或带对齐样式的块级容器内部 Markdown 语法与标签之间有独立空行，
  // 避免 CommonMark 将单换行包裹的 # 标题识别为原始纯文本
  text = text.replace(
    /(<(?:div|p)\b[^>]*(?:\balign\s*=|style\s*=\s*['"][^'"]*text-align)[^>]*>)\s*([^\n\s][\s\S]*?)\s*(<\/(?:div|p)>)/gi,
    '$1\n\n$2\n\n$3',
  );

  // 1. 段落小标题加粗：独立成行的「诉讼请求：」「事实与理由：」统一输出粗体标记
  text = boldLegalSectionHeadings(text);

  // 2. 防止 Setext heading：在 --- 或 === 分割线前如果紧跟着文字且无空行，插入空行以确保解析为分割线而非二级标题
  text = text.replace(/([^\n])\n(---|\*\*\*|___)\s*$/gm, '$1\n\n$2');

  // 3. 规范化公文大写数字层级标题（一、二、... 基于 isLegalChapterHeading 行级谓词精准提升为二级标题，彻底杜绝连续序数误伤；（一）（二）... 自动识别为三级公文小标题）
  text = text
    .split('\n')
    .map((line) => {
      if (isLegalChapterHeading(line)) {
        return `## ${line.trim()}`;
      }
      return line;
    })
    .join('\n');
  text = text.replace(/(^|\n)(?!\s*#)\s*([（(][一二三四五六七八九十]+[）)][^\n]+)/g, '$1### $2');

  // 4. 规范化粗体内部末尾空格（例如 "**诉讼请求: **" -> "**诉讼请求:** "）
  // 必须只匹配水平空白 [^\S\n]，严禁匹配换行符
  text = text
    .replace(/\*\*([^\*\n]+?)[^\S\n]+\*\*/g, '**$1** ')
    .replace(/[^\S\n]+\*\*([^\*\n]+?)\*\*/g, ' **$1**');

  // 5. 规范化复合标题符号（例如 "## # 附件" -> "## 附件"）
  // 必须要求两个井号块之间有至少一个水平空白符 [^\S\n]+，严禁 0 空格匹配导致误伤合法 ## / ### 标题
  text = text.replace(/(^|\n)(#{1,6})[^\S\n]+#+[^\S\n]*/g, '$1$2 ');

  return text;
};
