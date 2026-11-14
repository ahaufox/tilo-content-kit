/**
 * components — /markdown 默认元素映射（结构语义层，不含视觉类名）
 *
 * 方案 B 之后视觉全部由 `styles.css` 的 `.tk-content` 规则承担，本文件保留
 * "必须改写 DOM 结构"的核心映射：
 *   1. table：套一层横向滚动容器（`tk-table-wrap`），否则宽表撑破版心；
 *   2. code/pre：react-markdown v10 不再提供 inline 标记，需按 AST 位置判定块级；
 *   3. a：强制 `target="_blank"` + `rel="noopener noreferrer"`；
 *   4. br / td / th：托底保障表格单元格内的换行标签正确渲染为原生 <br />，杜绝裸露字符串。
 *
 * 其余元素（thead / tbody / tr / p / h1-h6 ...）使用默认渲染，
 * 由 CSS 按语义选择器着色，避免 SDK 与宿主各维护一份 class 清单。
 *
 * 业务化锚点（如 citation://）由宿主在 `components` 中覆盖 `a` 实现。
 */
import React from 'react';
import type { Components } from 'react-markdown';

const BR_TEXT_SPLIT_REGEX = /(<(?:br(?:\s+[^>]*)?\/?>|\/\s*br>)|&lt;(?:\/|\s*)?br\s*\/?&gt;)/gi;
const EXACT_BR_TEXT_REGEX = /^(?:<(?:br(?:\s+[^>]*)?\/?>|\/\s*br>)|&lt;(?:\/|\s*)?br\s*\/?&gt;)$/i;

/**
 * 递归清洗并转换单元格子节点中的字面量 <br> 标签为原生 React <br /> 元素
 * 作为 remark 插件与预处理器的终极托底道防线，彻底杜绝任何裸露文本
 */
function renderCellChildren(children: React.ReactNode): React.ReactNode {
  if (typeof children === 'string') {
    if (BR_TEXT_SPLIT_REGEX.test(children)) {
      const parts = children.split(BR_TEXT_SPLIT_REGEX);
      return parts.map((part, idx) => {
        if (EXACT_BR_TEXT_REGEX.test(part)) {
          return <br key={idx} />;
        }
        return part;
      });
    }
    return children;
  }

  if (Array.isArray(children)) {
    return React.Children.map(children, (child) => renderCellChildren(child));
  }

  if (React.isValidElement(children)) {
    // 保留 code 元素内部原样，不作误伤替换
    if (children.type === 'code' || (children.props as any)?.className?.includes('code')) {
      return children;
    }
    const childProps = children.props as { children?: React.ReactNode; [key: string]: any };
    if (childProps?.children) {
      return React.cloneElement(
        children as React.ReactElement<any>,
        {},
        renderCellChildren(childProps.children)
      );
    }
  }

  return children;
}

export const defaultMarkdownComponents: Components = {
  table: ({ children, ...props }) => (
    <div className="tk-table-wrap">
      <table {...props}>{children}</table>
    </div>
  ),
  td: ({ children, ...props }) => (
    <td {...props}>{renderCellChildren(children)}</td>
  ),
  th: ({ children, ...props }) => (
    <th {...props}>{renderCellChildren(children)}</th>
  ),
  br: () => <br />,
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
