# API 快照：@tilo-ui/content-kit/markdown

> 自动生成，请勿手改。刷新：`pnpm api:update`。校验：`pnpm api:check`。

<!-- 类型摘要 sha256:20a93afbb6e2fbb8 -->

## 运行时导出符号

- `CONTENT_KIT_VERSION`
- `MARKDOWN_PROSE_CLASSES`
- `MarkdownContent`
- `StreamingMarkdown`
- `defaultMarkdownClassName`
- `defaultMarkdownComponents`
- `defaultRemarkPlugins`
- `preprocessMarkdown`
- `preprocessMarkdownTable`
- `remarkGfm`
- `remarkHtmlBreaks`

## 类型声明（归一化，含本地共享 chunk）

```ts
export { C as CONTENT_KIT_VERSION } from './version.js';
import remarkGfm from 'remark-gfm';
export { default as remarkGfm } from 'remark-gfm';
import { r as remarkHtmlBreaks } from './table-preprocessor.js';
export { p as preprocessMarkdownTable } from './table-preprocessor.js';
import ReactMarkdown, { Components } from 'react-markdown';
import * as React from 'react';

/**
 * remarkPlugins — /markdown 统一渲染器共享的 remark 插件组合
 *
 * 与宿主 assistant-ui / composite 渲染器保持一致：
 *   - remark-gfm：GFM 表格、删除线、任务列表、链接自动识别；
 *   - remarkHtmlBreaks：把大模型/复制粘贴残留的 HTML <br> 转为原生 break 节点，
 *     彻底解决裸 <br> 文本裸露问题。
 *
 * remarkHtmlBreaks 的实现位于 src/internal/markdown，与 /content 共用同一份定义。
 */

/**
 * 默认 remark 插件组合。宿主可整体替换或追加业务插件。
 */
declare const defaultRemarkPlugins: (typeof remarkHtmlBreaks | typeof remarkGfm)[];

/**
 * preprocess — /markdown 统一渲染器共享的 Markdown 预处理
 *
 * 只做与渲染安全相关的通用规整（表格缺失换行/粘连），不含任何业务语义。
 * 实现位于 src/internal/markdown/table-preprocessor，与 /content 共用同一份定义。
 *
 * 业务预处理（如 citation 事实出处角标）由宿主在调用处叠加，例如：
 *   preprocess: (text) => citationPreprocessor(preprocessMarkdownTable(text))
 */

/**
 * 通用 Markdown 预处理：规整表格后再交给具体宿主叠加业务预处理。
 */
declare function preprocessMarkdown(text: string): string;

declare const defaultMarkdownComponents: Components;

/**
 * theme — /markdown 容器主题（0.6.0 起由随包 CSS 承担）
 *
 * 历史：早期用 @tailwindcss/typography 的 prose 工具类做排版，依赖宿主 Tailwind
 * 扫描本包产物（@source），样式正确性由一条不可见的编译期契约决定。
 * 方案 B 之后排版基线写进 `styles.css` 的 `.tk-content` 规则，全部走 `--tk-*`
 * 变量，因此这里不再输出任何 utility 类名。
 *
 * 兼容：两个符号保留导出，避免宿主 import 断裂；值已置空，宿主无需改动即可运行。
 */
/**
 * @deprecated 随包 CSS 已提供排版基线，本常量恒为空数组；1.0 移除。
 */
declare const MARKDOWN_PROSE_CLASSES: readonly string[];
/**
 * @deprecated 随包 CSS 已提供排版基线，本常量恒为空字符串；1.0 移除。
 */
declare const defaultMarkdownClassName = "";

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

type MarkdownComponents = NonNullable<React.ComponentProps<typeof ReactMarkdown>['components']>;
type RemarkPluginList = NonNullable<React.ComponentProps<typeof ReactMarkdown>['remarkPlugins']>;
interface MarkdownContentProps {
    content: string;
    className?: string;
    components?: MarkdownComponents;
    remarkPlugins?: RemarkPluginList;
    preprocess?: (text: string) => string;
}
declare function MarkdownContent({ content, className, components, remarkPlugins, preprocess, }: MarkdownContentProps): React.JSX.Element;

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

interface StreamingMarkdownProps extends MarkdownContentProps {
    isStreaming?: boolean;
}
declare function StreamingMarkdown({ isStreaming, ...rest }: StreamingMarkdownProps): React.JSX.Element;

export { MARKDOWN_PROSE_CLASSES, MarkdownContent, type MarkdownContentProps, StreamingMarkdown, type StreamingMarkdownProps, defaultMarkdownClassName, defaultMarkdownComponents, defaultRemarkPlugins, preprocessMarkdown, remarkHtmlBreaks };
```
