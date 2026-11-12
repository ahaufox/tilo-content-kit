/**
 * convert/convert — Markdown ↔ HTML 转换（重依赖入口）
 *
 * 为什么与 /content 分离：本文件在模块顶层创建 TurndownService 并 import marked，
 * 属不可 tree-shake 的副作用。只做判定/清洗的调用方不应被迫加载两个转换器。
 *
 * 依赖方向：convert → content(判定/表格宽度) + legal(公文归一化)，不得反向。
 */
import { marked } from 'marked';
import TurndownService from 'turndown';
import {
  containsDisguisedMarkdown,
  isBlockContent,
  isHtml,
  isMarkdown,
} from '../content/classify';
import { injectTableWidthsToHtml } from '../content/table-layout';
import { normalizeLegalMarkdown } from '../legal/normalize';

/**
 * 将块级容器 <div align="X"> / <p align="X"> 的对齐属性下沉到其内部块级子元素
 * （p / h1-h6），转为 style="text-align: X"，并解包容器本身。
 *
 * Tiptap 未注册 div 节点扩展，且 @tiptap/extension-text-align 仅识别
 * style="text-align: ..."，直接传入 <div align="X"> 会导致对齐属性被 unwrap 吞掉。
 * 此函数在进入编辑器前把 align 下沉为内联 style，确保居中/右对齐在编辑态不丢失。
 */
const downcastAlignToInlineStyle = (html: string): string => {
  if (!html) return html;
  return html.replace(
    /<(div|p)\b([^>]*)\balign\s*=\s*["']?\s*(center|right|left|justify)\s*["']?([^>]*)>([\s\S]*?)<\/\1>/gi,
    (_m: string, _tag: string, _before: string, align: string, _after: string, inner: string) => {
      const style = `text-align: ${align}`;
      // 内部已含块级标签：给每个块级子元素注入 style="text-align: ..."
      if (/<(p|h[1-6])\b/i.test(inner)) {
        return inner.replace(/<(p|h[1-6])\b([^>]*)>/gi, (m: string, t: string, attrs: string) => {
          if (/style\s*=\s*["'][^"']*text-align/i.test(attrs)) {
            return m;
          }
          return `<${t}${attrs} style="${style}">`;
        });
      }
      // 内部为纯文本：按段落拆分，包裹为带对齐样式的 <p>（软换行转 <br>）
      const trimmedInner = inner.trim();
      if (!trimmedInner) return '';
      return trimmedInner
        .split(/\n\s*\n+/)
        .map((p: string) => {
          const lines = p.split('\n').map((l: string) => l || '<br>').join('<br>');
          return `<p style="${style}">${lines}</p>`;
        })
        .join('');
    },
  );
};

/**
 * 强制确保内容为合法 HTML 格式（Markdown 自动解析为 HTML）
 */
export const ensureHtml = (content: string): string => {
  if (!content) return '';
  // 如果已经是合法且结构完整的 HTML 格式（且不含伪装 Markdown），注入表格列宽后返回
  if (isHtml(content)) {
    return downcastAlignToInlineStyle(injectTableWidthsToHtml(content));
  }
  // 如果是 Markdown 格式（或伪装在简易 HTML 外壳中的 Markdown），使用规范化预处理 + marked 解析
  if (isMarkdown(content) || containsDisguisedMarkdown(content) || /(?:^|\n)\s*(?:#{1,6}\s+|\||\*\*|[一二三四五六七八九十]+、)/m.test(content)) {
    try {
      const normalized = normalizeLegalMarkdown(content);
      const parsed = marked.parse(normalized, { gfm: true, breaks: true });
      if (typeof parsed === 'string') {
        // TipTap TableCell: content="block+" 要求每个单元格至少有一个 block 节点
        // 空 <td></td> 会被 ProseMirror schema 验证丢弃，导致缺行缺列
        const fixedHtml = parsed
          .replace(/<td><\/td>/g, '<td><span>​</span></td>')
          .replace(/<th><\/th>/g, '<th><span>​</span></th>');
        return downcastAlignToInlineStyle(injectTableWidthsToHtml(fixedHtml));
      }
    } catch (e) {
      console.error('Failed to parse markdown in convert:', e);
    }
  }

  // 否则按 Markdown 段落语义转换：
  //   \n\n = 段落分隔 → </p><p>
  //   \n   = 段内软换行 → <br>
  const paragraphs = content.split(/\n\n+/);
  return paragraphs
    .map((p) => {
      const lines = p.split('\n');
      return `<p>${lines.map((l) => l || '<br>').join('<br>')}</p>`;
    })
    .join('');
};

/**
 * 将内容转换为行内 HTML 格式（不包裹 <p> 块级标签，避免选区插入时造成意外断行）
 */
export const ensureInlineHtml = (content: string): string => {
  if (!content) return '';
  const trimmed = content.trim();
  if (!trimmed) return '';

  // 如果原本被单个 <p>...</p> 包裹且内部没有其他块级标签，先剥离外层 <p>
  let cleanText = trimmed;
  if (/^\s*<p>([\s\S]*?)<\/p>\s*$/i.test(cleanText)) {
    const inner = cleanText.replace(/^\s*<p>([\s\S]*?)<\/p>\s*$/i, '$1');
    if (!/<\/?(p|div|ul|ol|li|h[1-6]|blockquote|table|pre|hr)[\s\S]*?>/i.test(inner)) {
      cleanText = inner.trim();
    }
  }

  // 使用 marked.parseInline 解析行内 Markdown 语法
  try {
    const parsed = marked.parseInline(cleanText);
    if (typeof parsed === 'string') {
      return parsed;
    }
  } catch (e) {
    console.error('Failed to parse inline markdown in convert:', e);
  }

  return cleanText;
};

/**
 * 为选区替换准备 HTML 内容：
 * - 当 isInline 为 true 且内容不包含块级结构时，返回行内 HTML（避免破坏当前段落导致换行）
 * - 否则返回标准块级 HTML（ensureHtml）
 */
export const ensureSelectionHtml = (content: string, isInline: boolean = false): string => {
  if (!content) return '';
  const trimmed = content.trim();
  if (!trimmed) return '';

  if (isInline && !isBlockContent(trimmed)) {
    return ensureInlineHtml(trimmed);
  }

  return ensureHtml(trimmed);
};

// 初始化并配置全局 Turndown 转换实例
const turndownService = new TurndownService({
  headingStyle: 'atx',
  hr: '---',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
});

// 支持标准 Markdown 表格转换规则
turndownService.addRule('table', {
  filter: 'table',
  replacement: function (_content: string, node: any) {
    if (!node || typeof node.querySelectorAll !== 'function') return '\n\n' + _content + '\n\n';
    const rows = Array.from(node.querySelectorAll('tr')) as any[];
    if (rows.length === 0) return '';
    const tableLines = rows.map((row: any, idx: number) => {
      const cells = Array.from(row.children).map((cell: any) =>
        cell.textContent.trim().replace(/\|/g, '\\|')
      );
      const line = `| ${cells.join(' | ')} |`;
      if (idx === 0) {
        const separator = `| ${cells.map(() => '---').join(' | ')} |`;
        return `${line}\n${separator}`;
      }
      return line;
    });
    return '\n\n' + tableLines.join('\n') + '\n\n';
  },
});

// 支持对齐属性的 Markdown 转换规则（转为公文标准的 <div align="..."> 容器）
turndownService.addRule('alignedBlock', {
  filter: function (node: HTMLElement) {
    const nodeName = node.nodeName.toUpperCase();
    if (!['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'DIV'].includes(nodeName)) {
      return false;
    }
    const style = (node as HTMLElement).getAttribute('style') || '';
    const alignAttr = (node as HTMLElement).getAttribute('align') || '';
    return /text-align:\s*(center|right)/i.test(style) || /^(center|right)$/i.test(alignAttr);
  },
  replacement: function (content: string, node: HTMLElement | any) {
    const style = (node as HTMLElement).getAttribute('style') || '';
    const alignAttr = (node as HTMLElement).getAttribute('align') || '';
    let align = 'center';
    if (/text-align:\s*right/i.test(style) || /^right$/i.test(alignAttr)) {
      align = 'right';
    }
    const nodeName = node.nodeName.toUpperCase();
    const cleanContent = content.trim();
    if (!cleanContent) return '';

    if (/^H[1-6]$/.test(nodeName)) {
      const level = parseInt(nodeName.slice(1), 10);
      const hashes = '#'.repeat(level);
      return `\n\n<div align="${align}">\n\n${hashes} ${cleanContent}\n\n</div>\n\n`;
    }

    return `\n\n<div align="${align}">\n\n${cleanContent}\n\n</div>\n\n`;
  },
});

/**
 * 将 HTML 字符串转换为清洗后的标准 Markdown 字符串
 */
export const htmlToMarkdown = (html: string): string => {
  if (!html) return '';
  // 清理 ProseMirror/Tiptap 产生的尾部多余空段落
  const cleaned = html
    .replace(/<p><\/p>$/i, '')
    .replace(/<p><br\s*\/?><\/p>$/i, '');
  const md = turndownService.turndown(cleaned).trim();
  // 合并相邻相同的 <div align="X"> 容器，保持 Markdown 简洁优雅
  const merged = md.replace(
    /<\/div>\s*<div\s+align=["'](center|right)["']>/gi,
    '\n\n',
  );
  return merged;
};
