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
import remarkGfm from 'remark-gfm';
import { remarkHtmlBreaks } from '../internal/markdown/remark-html-breaks';

export { remarkHtmlBreaks } from '../internal/markdown/remark-html-breaks';
export { default as remarkGfm } from 'remark-gfm';

/**
 * 默认 remark 插件组合。宿主可整体替换或追加业务插件。
 */
export const defaultRemarkPlugins = [remarkGfm, remarkHtmlBreaks];
