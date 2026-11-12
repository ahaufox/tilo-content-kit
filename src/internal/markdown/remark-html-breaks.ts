/**
 * remark-html-breaks.ts — Remark 插件：安全将 HTML <br> 标签转换为 Markdown break AST 节点
 *
 * 职责：
 *   - 识别 Markdown AST 中所有 html 节点与 text 节点内包含的 <br>、<br/>、<br >、<br />、<BR> 等标签；
 *   - 将其安全转为 mdast 标准 break 节点 ({ type: 'break' })，使其由 ReactMarkdown 渲染为原生 <br />；
 *   - 彻底解决大模型在 GFM 表格单元格或文本流中输出 <br> / <br > 导致前端裸露显示文本的问题；
 *   - 严格遵守 infra-dependency-compat-rule.md：不引入存在打包兼容性缺陷的 rehype-raw。
 */

interface AstNode {
  type: string;
  value?: string;
  children?: AstNode[];
  [key: string]: unknown;
}

const BR_TAG_REGEX = /<br\s*\/?>/i;
const BR_TAG_SPLIT_REGEX = /(<br\s*\/?>)/i;
const EXACT_BR_REGEX = /^<br\s*\/?>$/i;

/**
 * Remark 插件：将 HTML <br> 转换为 mdast break 节点
 */
export function remarkHtmlBreaks() {
  return (tree: AstNode) => {
    function walk(node: AstNode) {
      if (!node.children || !Array.isArray(node.children)) return;

      const nextChildren: AstNode[] = [];

      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];

        // 1. 如果是 html 节点且为 <br> / <br/> / <br > / <br /> / <BR>
        if (child.type === 'html') {
          const htmlVal = (child.value || '').trim();
          if (EXACT_BR_REGEX.test(htmlVal)) {
            nextChildren.push({ type: 'break' });
            continue;
          }
        }

        // 2. 如果是 text 节点且包含 <br...> 标签（防御性拆分）
        if (child.type === 'text') {
          const textVal = child.value || '';
          if (BR_TAG_REGEX.test(textVal)) {
            const parts = textVal.split(BR_TAG_SPLIT_REGEX);
            for (const part of parts) {
              if (EXACT_BR_REGEX.test(part)) {
                nextChildren.push({ type: 'break' });
              } else if (part) {
                nextChildren.push({ type: 'text', value: part });
              }
            }
            continue;
          }
        }

        // 3. 递归遍历包含 children 的容器节点（code 与 inlineCode 无 children，天然受保护）
        if (child.children && Array.isArray(child.children)) {
          walk(child);
        }

        nextChildren.push(child);
      }

      node.children = nextChildren;
    }

    walk(tree);
  };
}

export default remarkHtmlBreaks;
