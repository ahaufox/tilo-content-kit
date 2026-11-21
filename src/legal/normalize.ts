/**
 * legal/normalize — 中国法律文书 Markdown 归一化（纯函数，零依赖）
 *
 * 职责边界：只处理公文书写习惯带来的 Markdown 解析问题（段落小标题加粗、
 * 大写数字层级标题、对齐容器脱壳、Setext 标题误判等），不做任何 HTML 渲染。
 *
 * 域约束：本文件属于中国法律文书域，与"通用内容能力"分属不同入口（/legal）。
 */
import { boldLegalSectionHeadings } from './legal-section-headings';
import { isLegalChapterHeading, isLegalSubSectionHeading } from './document-title';
import { normalizeAlignContainers } from './align-containers';

/**
 * 规范化法律文书中的 Markdown 标记（修复粗体空格、Setext 标题被误食换行、复合标题与公文大写数字层级）
 */
export const normalizeLegalMarkdown = (content: string): string => {
  if (!content) return '';
  let text = content.trim();

  // 自愈连续转义下划线（例如历史存量中由 turndown 误转义的 \_\_\_\_ 恢复为原生留白填空横线 ____）
  text = text.replace(/(?:\\_){2,}/g, (m) => '_'.repeat(m.length / 2));

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

  // 关键修复 (CNB Issue #585)：确保带对齐样式的块级容器（如 <div align="center">...</div>）：
  // 1. 外部起始前与闭合后均具有双向空行隔离 (\n\n)，阻断 CommonMark HTML Block 对后续有序列表（1. 判令...）的吞噬；
  // 2. 内部 Markdown 与标签之间具有独立空行，避免标题退化为裸文本；
  // 3. 严格限定于含对齐样式的排版容器，严禁对普通的 <td><p>...</p></td> 等表格内部产生破坏性断行。
  text = normalizeAlignContainers(text);

  // 解决同一行紧凑编写多个列表项场景（如 "1. 判令...； 2. 判令..."），将其拆分为独立行以确保编译为标准有序列表
  // 分隔符后的空白只吃行内空格 [ \t]*，严禁吞掉已有换行，否则二次归一化会在列表项之间多插一个空行（破坏幂等性）
  text = text.replace(
    /([；;。])[ \t]*((?:\d+[.、]|（\d+）|\(\d+\))\s*(?:判令|请求|确认|判决|支付|赔偿|归还|返还|承担))/g,
    '$1\n$2',
  );

  // 1. 段落小标题加粗：独立成行的「诉讼请求：」「事实与理由：」统一输出粗体标记
  text = boldLegalSectionHeadings(text);

  // 2. 防止 Setext heading：在 --- 或 === 分割线前如果紧跟着文字且无空行，插入空行以确保解析为分割线而非二级标题
  text = text.replace(/([^\n])\n(---|\*\*\*|___)\s*$/gm, '$1\n\n$2');

  // 3. 规范化公文大写数字层级标题（一、二、... 基于 isLegalChapterHeading 行级谓词精准提升为二级标题，彻底杜绝连续序数误伤；（一）（二）... 基于 isLegalSubSectionHeading 行级谓词精准识别为三级公文小标题）
  text = text
    .split('\n')
    .map((line) => {
      if (isLegalChapterHeading(line)) {
        return `## ${line.trim()}`;
      }
      if (isLegalSubSectionHeading(line)) {
        return `### ${line.trim()}`;
      }
      return line;
    })
    .join('\n');

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
