/**
 * components — /markdown 默认元素映射（结构语义层，不含视觉类名）
 *
 * 方案 B 之后视觉全部由 `styles.css` 的 `.tk-content` 规则承担，本文件只保留
 * "必须改写 DOM 结构"的三处：
 *   1. table：套一层横向滚动容器（`tk-table-wrap`），否则宽表撑破版心；
 *   2. code/pre：react-markdown v10 不再提供 inline 标记，需按 AST 位置判定块级；
 *   3. a：强制 `target="_blank"` + `rel="noopener noreferrer"`。
 *
 * 其余元素（thead / tbody / tr / th / td / p / h1-h6 ...）一律使用默认渲染，
 * 由 CSS 按语义选择器着色，避免 SDK 与宿主各维护一份 class 清单。
 *
 * 业务化锚点（如 citation://）由宿主在 `components` 中覆盖 `a` 实现。
 */
import type { Components } from 'react-markdown';

export const defaultMarkdownComponents: Components = {
  table: ({ children, ...props }) => (
    <div className="tk-table-wrap">
      <table {...props}>{children}</table>
    </div>
  ),
  code: ({ className, children, node, ...props }) => {
    // react-markdown v10 不再提供 inline 标志；用 AST 位置（跨行=块级）或 language class 判定，
    // 避免无语言块级代码被误判为行内而丢失 <pre> 包裹。
    const pos = (node as { position?: { start: { line: number }; end: { line: number } } } | undefined)
      ?.position;
    const isMultiline = !!pos && pos.start.line !== pos.end.line;
    const isBlock = (className ? /language-/.test(className) : false) || isMultiline;
    if (!isBlock) {
      return <code {...props}>{children}</code>;
    }
    return (
      <pre>
        <code className={className} {...props}>
          {children}
        </code>
      </pre>
    );
  },
  pre: ({ children }) => <>{children}</>,
  a: ({ children, href, ...props }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
      {children}
    </a>
  ),
};
