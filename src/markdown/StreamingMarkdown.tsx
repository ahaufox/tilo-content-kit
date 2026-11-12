/**
 * StreamingMarkdown — 增量/流式 Markdown 渲染容器
 *
 * 与 MarkdownContent 共用同一套 remarkPlugins / components / preprocess / 主题，
 * 仅额外支持 `isStreaming` 标志：
 *   - 增量内容由宿主把不断累积的 Markdown 字符串传入 `content`，组件无状态依赖；
 *   - 推流期间可选渲染尾部光标，提供打字机视觉反馈。
 *
 * 流式未闭合边界守卫（如 citation 角标、未闭合代码块）由宿主在 `preprocess` 中处理，
 * 本组件只负责把最新 content 渲染出来。
 */
import * as React from 'react';
import { MarkdownContent, type MarkdownContentProps } from './MarkdownContent';

export interface StreamingMarkdownProps extends MarkdownContentProps {
  isStreaming?: boolean;
}

export function StreamingMarkdown({ isStreaming, ...rest }: StreamingMarkdownProps) {
  return (
    <div data-streaming={isStreaming ? true : undefined}>
      <MarkdownContent {...rest} />
      {isStreaming ? (
        <span aria-hidden data-testid="streaming-cursor" className="tk-cursor">
          ▍
        </span>
      ) : null}
    </div>
  );
}

export default StreamingMarkdown;
