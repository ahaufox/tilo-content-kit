/**
 * MarkdownContent — 静态 Markdown 渲染容器（零业务依赖）
 *
 * 以 react-markdown 为底座，统一装配 defaultRemarkPlugins / defaultMarkdownComponents /
 * preprocessMarkdown / 默认 prose 主题。宿主可逐项覆盖：
 *   - components：覆盖表格/代码/链接等元素映射（如注入 citation 锚点）；
 *   - remarkPlugins：追加业务 remark 插件；
 *   - preprocess：叠加业务预处理；
 *   - className：整体覆盖或追加容器主题类。
 *
 * 空内容交由宿主在调用处决定（如 EmptyState），本组件仅返回空容器。
 */
import * as React from 'react';
import ReactMarkdown from 'react-markdown';
import { defaultRemarkPlugins } from './remarkPlugins';
import { defaultMarkdownComponents } from './components';
import { preprocessMarkdown } from './preprocess';
import { defaultMarkdownClassName } from './theme';

type MarkdownComponents = NonNullable<React.ComponentProps<typeof ReactMarkdown>['components']>;
type RemarkPluginList = NonNullable<React.ComponentProps<typeof ReactMarkdown>['remarkPlugins']>;

export interface MarkdownContentProps {
  content: string;
  className?: string;
  components?: MarkdownComponents;
  remarkPlugins?: RemarkPluginList;
  preprocess?: (text: string) => string;
}

export function MarkdownContent({
  content,
  className,
  components,
  remarkPlugins,
  preprocess,
}: MarkdownContentProps) {
  const source = (preprocess ?? preprocessMarkdown)((content ?? '').trim());
  // tk-content 是随包样式的主题作用域；defaultMarkdownClassName 保留为宿主可选增强
  const rootClassName = ['tk-content', defaultMarkdownClassName, className].filter(Boolean).join(' ');
  return (
    <div className={rootClassName}>
      <ReactMarkdown
        remarkPlugins={remarkPlugins ?? (defaultRemarkPlugins as RemarkPluginList)}
        components={components ?? defaultMarkdownComponents}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}

export default MarkdownContent;
