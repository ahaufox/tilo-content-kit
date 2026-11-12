/**
 * docsMarkdown — README 文档面板的 Markdown 元素覆盖（带复制按钮的代码块）
 *
 * dogfooding 语义不变：README 仍由 SDK 的 MarkdownContent 渲染，本文件只在
 * `components` 层覆盖 code / pre —— 与 SDK 默认实现同样按 AST 位置判块级，
 * 只是给块级代码加了一条「复制」操作条。其余元素（table / a）原样复用
 * defaultMarkdownComponents，避免演示站另起一套元素映射。
 */
import type { Components } from 'react-markdown';
import { defaultMarkdownComponents } from '@tilo-ui/content-kit/markdown';
import { CopyButton } from './CodeSample';

/** 取代码块的纯文本：子节点通常是单个字符串，防御性兼容数组与节点 */
function codeText(children: unknown): string {
  if (typeof children === 'string') return children;
  if (typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(codeText).join('');
  return '';
}

export const docsMarkdownComponents: Components = {
  ...defaultMarkdownComponents,
  code: ({ className, children, node, ...props }) => {
    const pos = (node as { position?: { start: { line: number }; end: { line: number } } } | undefined)
      ?.position;
    const isMultiline = !!pos && pos.start.line !== pos.end.line;
    const isBlock = (className ? /language-/.test(className) : false) || isMultiline;
    if (!isBlock) {
      return <code {...props}>{children}</code>;
    }
    const text = codeText(children);
    const lang = className?.replace(/^language-/, '') || 'code';
    return (
      <div className="doc-code">
        <div className="code-meta">
          <span>{lang}</span>
          <CopyButton text={text} />
        </div>
        <pre>
          <code className={className} {...props}>
            {children}
          </code>
        </pre>
      </div>
    );
  },
  pre: ({ children }) => <>{children}</>,
};

export default docsMarkdownComponents;
