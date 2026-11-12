/**
 * /tiptap — Tiptap 扩展入口（0.6.0 起由 /editor 更名，/editor 保留为过渡别名）
 *
 * 设计边界：仅上收业务无关的纯 Tiptap/ProseMirror 扩展实现。UI 编辑器组件
 * （MarkdownRichEditor / Toolbar / TableBubbleMenu）因强依赖宿主 Tailwind 原子类、
 * lucide 图标与业务 UI 组件，仍留在宿主，通过本入口复用以下扩展，避免跨层耦合。
 */
export { CONTENT_KIT_VERSION } from '../version';

export {
  ResizableTable,
  ResizableTableHeader,
  ResizableTableCell,
  TABLE_COLUMN_CLICK_EVENT,
  resolveHandleTarget,
  USER_TABLE_RESIZE_ORIGIN,
} from './ResizableTable';

export type { TableColumnClickDetail } from './ResizableTable';
