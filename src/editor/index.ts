/**
 * /editor — 富文本编辑器与工具栏完整基座入口
 *
 * 职责：导出开箱即用的受控 RichEditor、标准格式化 EditorToolbar、
 * 零外部依赖的 ColorPicker、默认扩展装配工厂与 ResizableTable 列宽持久化系列。
 */
export { CONTENT_KIT_VERSION } from '../version';

export { RichEditor, type RichEditorProps } from './RichEditor';
export { EditorToolbar, type EditorToolbarProps } from './EditorToolbar';
export { ColorPicker, type ColorPickerProps } from './ColorPicker';
export {
  DEFAULT_TEXT_COLORS,
  DEFAULT_HIGHLIGHT_COLORS,
  type ColorOption,
} from './colors';
export {
  createDefaultEditorExtensions,
  type DefaultEditorExtensionsOptions,
} from './defaultExtensions';

// 导出 Tiptap 表格扩展底层契约（保持与 /tiptap 完全一致）
export {
  ResizableTable,
  ResizableTableHeader,
  ResizableTableCell,
  TABLE_COLUMN_CLICK_EVENT,
  USER_TABLE_RESIZE_ORIGIN,
  resolveHandleTarget,
} from '../tiptap/ResizableTable';

export type { TableColumnClickDetail } from '../tiptap/ResizableTable';
