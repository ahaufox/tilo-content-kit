/**
 * /tiptap — Tiptap 扩展与编辑器基座入口
 *
 * 包含纯 Tiptap/ProseMirror 扩展（ResizableTable 等）以及开箱即用的 RichEditor 与 EditorToolbar。
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

// 导出编辑器与格式工具栏基座组件
export {
  RichEditor,
  type RichEditorProps,
} from '../editor/RichEditor';

export {
  EditorToolbar,
  type EditorToolbarProps,
} from '../editor/EditorToolbar';

export {
  ColorPicker,
  type ColorPickerProps,
} from '../editor/ColorPicker';

export {
  DEFAULT_TEXT_COLORS,
  DEFAULT_HIGHLIGHT_COLORS,
  type ColorOption,
} from '../editor/colors';

export {
  createDefaultEditorExtensions,
  type DefaultEditorExtensionsOptions,
} from '../editor/defaultExtensions';
