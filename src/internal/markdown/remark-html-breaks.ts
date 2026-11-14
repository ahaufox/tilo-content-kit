/**
 * remark-html-breaks.ts — Remark 插件：安全将 HTML <br> 标签及转义实体转换为 Markdown break AST 节点
 *
 * 职责：
 *   - 识别 Markdown AST 中所有 html 节点与 text 节点内包含的 <br>、<br/>、<br >、<br />、<BR> 等标签；
 *   - 兼容支持闭合标签 </br> 以及 HTML 实体转义字符 &lt;br&gt;、&lt;br/&gt;、&lt;br &gt;、&lt;br /&gt;、&lt;/br&gt;；
 *   - 支持 html 节点内混排文本与多个 <br> 标签（防御性拆分，消除 exact 匹配遗漏）；
 *   - 将其安全转为 mdast 标准 break 节点 ({ type: 'break' })，使其由 ReactMarkdown 渲染为原生 <br />；
 *   - 彻底解决大模型在 GFM 表格单元格或文本流中输出各种变体 <br> / <br > 导致前端裸露显示文本的问题；
 *   - 严格遵守 infra-dependency-compat-rule.md：不引入存在打包兼容性缺陷的 rehype-raw。
 */

interface AstNode {
  type: string;
  value?: string;
  children?: AstNode[];
  [key: string]: unknown;
}

const BR_PATTERN = /<(?:br(?:\s+[^>]*)?\/?>|\/\s*br>)|&lt;(?:br(?:\s+[^&>]*)?\/?|\/\s*br)&gt;/i;
const BR_SPLIT_PATTERN = /(<(?:br(?:\s+[^>]*)?\/?>|\/\s*br>)|&lt;(?:br(?:\s+[^&>]*)?\/?|\/\s*br)&gt;)/i;
const EXACT_BR_PATTERN = /^(?:<(?:br(?:\s+[^>]*)?\/?>|\/\s*br>)|&lt;(?:br(?:\s+[^&>]*)?\/?|\/\s*br)&gt;)$/i;

/**
 * 将包含 <br> 标签或实体的文本/html内容拆解为 break 节点与剩余内容节点
 */
function splitBrContent(value: string, defaultType: 'text' | 'html'): AstNode[] {
  if (!value) return [];
  if (!BR_PATTERN.test(value)) {
    return [{ type: defaultType, value }];
  }

  const parts = value.split(BR_SPLIT_PATTERN);
  const nodes: AstNode[] = [];

  for (const part of parts) {
    if (!part) continue;
    if (EXACT_BR_PATTERN.test(part)) {
      nodes.push({ type: 'break' });
    } else {
      nodes.push({ type: defaultType, value: part });
    }
  }

  return nodes;
}

/**
 * Remark 插件：将 HTML <br> 及其变体安全转换为 mdast break 节点
 */
export function remarkHtmlBreaks() {
  return (tree: AstNode) => {
    function walk(node: AstNode) {
      if (!node.children || !Array.isArray(node.children)) return;

      const nextChildren: AstNode[] = [];

      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];

        // 1. 如果是 html 节点且包含 br 标签或实体
        if (child.type === 'html') {
          const htmlVal = child.value || '';
          if (BR_PATTERN.test(htmlVal)) {
            const splitNodes = splitBrContent(htmlVal, 'html');
            nextChildren.push(...splitNodes);
            continue;
          }
        }

        // 2. 如果是 text 节点且包含 br 标签或实体（防御性拆分）
        if (child.type === 'text') {
          const textVal = child.value || '';
          if (BR_PATTERN.test(textVal)) {
            const splitNodes = splitBrContent(textVal, 'text');
            nextChildren.push(...splitNodes);
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
