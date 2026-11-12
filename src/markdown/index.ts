/**
 * /markdown — 统一 Markdown 渲染器入口
 *
 * 共用同一份 remarkPlugins / preprocess / components / 主题样式，提供：
 *   - MarkdownContent：静态渲染容器；
 *   - StreamingMarkdown：增量/流式渲染容器。
 *
 * 业务专属逻辑（citation 锚点、法律归一化预处理）不在此处，由宿主叠加。
 * remark 插件与表格预处理的实现位于 src/internal/markdown，避免与 /content 双份定义。
 */
export { CONTENT_KIT_VERSION } from '../version';
export * from './remarkPlugins';
export * from './preprocess';
export * from './components';
export * from './theme';
export * from './MarkdownContent';
export * from './StreamingMarkdown';
