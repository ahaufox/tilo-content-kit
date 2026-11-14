# API 快照：@tilo-ui/content-kit/compat-editor

> 自动生成，请勿手改。刷新：`pnpm api:update`。校验：`pnpm api:check`。

<!-- 类型摘要 sha256:c07ef87a6989bdcc -->

## 运行时导出符号

- `CONTENT_KIT_VERSION`
- `ColorPicker`
- `DEFAULT_HIGHLIGHT_COLORS`
- `DEFAULT_TEXT_COLORS`
- `EditorToolbar`
- `ResizableTable`
- `ResizableTableCell`
- `ResizableTableHeader`
- `RichEditor`
- `TABLE_COLUMN_CLICK_EVENT`
- `USER_TABLE_RESIZE_ORIGIN`
- `createDefaultEditorExtensions`
- `resolveHandleTarget`

## 类型声明（归一化，含本地共享 chunk）

```ts
export { C as CONTENT_KIT_VERSION } from './version.js';
export { U as USER_TABLE_RESIZE_ORIGIN } from './origins.js';
import * as _tiptap_core from '@tiptap/core';
import { Editor } from '@tiptap/core';
import * as _tiptap_extension_table from '@tiptap/extension-table';
import React__default from 'react';
import * as _tiptap_extension_highlight from '@tiptap/extension-highlight';
import * as _tiptap_extension_text_style from '@tiptap/extension-text-style';
import * as _tiptap_extension_text_align from '@tiptap/extension-text-align';
import * as _tiptap_extension_placeholder from '@tiptap/extension-placeholder';
import * as _tiptap_starter_kit from '@tiptap/starter-kit';

interface DefaultEditorExtensionsOptions {
    placeholder?: string;
    tableCellMinWidth?: number;
    headingLevels?: (1 | 2 | 3 | 4 | 5 | 6)[];
}
declare function createDefaultEditorExtensions(options?: DefaultEditorExtensionsOptions): (_tiptap_core.Node<_tiptap_extension_table.TableCellOptions, any> | _tiptap_core.Node<_tiptap_extension_table.TableOptions, any> | _tiptap_core.Extension<_tiptap_starter_kit.StarterKitOptions, any> | _tiptap_core.Extension<_tiptap_extension_placeholder.PlaceholderOptions, any> | _tiptap_core.Extension<_tiptap_extension_text_align.TextAlignOptions, any> | _tiptap_core.Mark<_tiptap_extension_text_style.TextStyleOptions, any> | _tiptap_core.Extension<_tiptap_extension_text_style.ColorOptions, any> | _tiptap_core.Mark<_tiptap_extension_highlight.HighlightOptions, any>)[];

/**
 * colors — 编辑器文字颜色与文本高亮预设常量
 *
 * 职责：提供 EditorToolbar 与 ColorPicker 的通用色板配置。
 * 遵循公文与通用报告排版规范，红色高亮（#ef4444）与 Word 导出及法律核对提醒对齐。
 */
interface ColorOption {
    name: string;
    value: string;
}
/** 常用文字颜色（应用于内容的行内 CSS / HTML 样式，非 UI 主题变量） */
declare const DEFAULT_TEXT_COLORS: ColorOption[];
/** 常用文本高亮颜色（应用于内容的高亮 mark 样式） */
declare const DEFAULT_HIGHLIGHT_COLORS: ColorOption[];

/**
 * RichEditor — 开箱即用的受控 Markdown / HTML 所见即所得富文本编辑器基座
 *
 * 核心规范：
 *   1. 外部默认以标准 Markdown 为单一事实来源（SSOT），亦兼容 HTML；
 *   2. 内部基于 Tiptap 3 提供高保真排版、表格列宽拖拽持久化与文字颜色/高亮；
 *   3. 挂载更新互斥锁与实质差异守卫，杜绝光标跳动与无限重渲染；
 *   4. 支持快捷键拦截（Ctrl+S 保存 / Esc 取消）；
 *   5. immediatelyRender: false 规避 SSR 服务端水合不一致；
 *   6. 零 Tailwind 强绑定，样式完全消费随包 `--tk-*` CSS 变量。
 */

interface RichEditorProps {
    value?: string;
    onChange?: (markdown: string) => void;
    onChangeHtml?: (html: string) => void;
    placeholder?: string;
    disabled?: boolean;
    autoFocus?: boolean;
    showToolbar?: boolean;
    extraToolbarActions?: React__default.ReactNode;
    onSaveShortcut?: () => void;
    onCancelShortcut?: () => void;
    className?: string;
    editorClassName?: string;
    textColors?: ColorOption[];
    highlightColors?: ColorOption[];
    extensions?: any[];
    extensionOptions?: DefaultEditorExtensionsOptions;
    dataTestId?: string;
    multilineToolbar?: boolean;
}
declare function RichEditor({ value, onChange, onChangeHtml, placeholder, disabled, autoFocus, showToolbar, extraToolbarActions, onSaveShortcut, onCancelShortcut, className, editorClassName, textColors, highlightColors, extensions, extensionOptions, dataTestId, multilineToolbar, }: RichEditorProps): React__default.JSX.Element;

/**
 * EditorToolbar — 标准纯净富文本格式化工具栏组件
 *
 * 职责：提供所见即所得编辑器顶部格式控制（基础排版、文字颜色、文本高亮、
 * 标题、对齐、列表、表格与行列控制、撤销重做等）。
 *
 * 架构规范：
 *   1. 零外部 UI 框架依赖，图标使用纯原生内联 SVG；
 *   2. 样式完全消费随包 `--tk-*` 设计 Token，宿主零配置即享统一风格；
 *   3. 原生内置 ColorPicker，打通文字颜色（如核对提醒标红）与高亮标记；
 *   4. 支持 `extraActions` 业务插槽与 React Portal 灵活挂载；
 *   5. 响应式与超宽自适应：
 *      - 默认单行滚动模式 (multiline=false)：格式按钮独立水平平滑横滑，右侧 extraActions 常驻吸附，绝不被挤出视口；
 *      - 多行折行模式 (multiline=true)：按语义化按钮组 (tk-toolbar-group) 整组折行，杜绝单个按钮破碎换行。
 */

interface EditorToolbarProps {
    editor: Editor;
    extraActions?: React__default.ReactNode;
    disabled?: boolean;
    className?: string;
    dataTestId?: string;
    textColors?: ColorOption[];
    highlightColors?: ColorOption[];
    btnActiveClass?: string;
    /**
     * 是否采用多行自适应折行排版（默认 false 为单行平滑横向滚动）
     * - false: 单行模式，格式按钮在窄屏下平滑横滑，右侧 extraActions 吸附常驻不被挤走；
     * - true: 多行自适应折行，按语义化功能组 (tk-toolbar-group) 整组换行，整洁紧凑。
     */
    multiline?: boolean;
}
declare function EditorToolbar({ editor, extraActions, disabled, className, dataTestId, textColors, highlightColors, btnActiveClass, multiline, }: EditorToolbarProps): React__default.JSX.Element | null;

/**
 * ColorPicker — 编辑器纯原生颜色选择器下拉组件
 *
 * 职责：提供轻量、零依赖的文字颜色与高亮画笔选择面板。
 * 纯原生 DOM 事件与 `--tk-*` CSS 变量驱动，自适应浅深色模式。
 */

interface ColorPickerProps {
    editor: Editor;
    type: 'text' | 'highlight';
    trigger: React__default.ReactNode;
    colors?: ColorOption[];
    title?: string;
    disabled?: boolean;
    className?: string;
    dataTestId?: string;
}
declare function ColorPicker({ editor, type, trigger, colors, title, disabled, className, dataTestId, }: ColorPickerProps): React__default.JSX.Element;

/**
 * tiptap/table/handle-click — 列边界手柄的点击识别（内部模块）
 *
 * 交互契约：用户在 column-resize-handle 上按下后几乎不位移地抬起（< 5px 且 < 400ms），
 * 判定为"点击"而非"拖拽"，通过 window 自定义事件通知宿主弹出列宽设置面板；
 * 拖拽行为仍由 prosemirror-tables 的 columnResizing 处理。
 */

declare const TABLE_COLUMN_CLICK_EVENT = "tiptap:table-column-click";
interface TableColumnClickDetail {
    tablePos: number;
    columnIndex: number;
    currentWidth: number | null;
    clientX: number;
    clientY: number;
}
/** 从 column-resize-handle 元素向上找到所属 table 节点位置及列索引。 */
declare function resolveHandleTarget(view: any, handleEl: HTMLElement): TableColumnClickDetail | null;

declare const ResizableTableCell: _tiptap_core.Node<_tiptap_extension_table.TableCellOptions, any>;
declare const ResizableTableHeader: _tiptap_core.Node<_tiptap_extension_table.TableHeaderOptions, any>;
declare const ResizableTable: _tiptap_core.Node<_tiptap_extension_table.TableOptions, any>;

export { type ColorOption, ColorPicker, type ColorPickerProps, DEFAULT_HIGHLIGHT_COLORS, DEFAULT_TEXT_COLORS, type DefaultEditorExtensionsOptions, EditorToolbar, type EditorToolbarProps, ResizableTable, ResizableTableCell, ResizableTableHeader, RichEditor, type RichEditorProps, TABLE_COLUMN_CLICK_EVENT, type TableColumnClickDetail, createDefaultEditorExtensions, resolveHandleTarget };
```
