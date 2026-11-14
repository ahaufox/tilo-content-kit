/**
 * defaultExtensions — 标准富文本编辑器默认扩展装配工厂
 *
 * 职责：提供开箱即用的 Tiptap 扩展配置，内置加粗、斜体、列表、
 * ResizableTable 表格列宽持久化、对齐方式、TextStyle、Color 与 Highlight。
 */
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import { TableRow } from '@tiptap/extension-table-row';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Highlight } from '@tiptap/extension-highlight';
import {
  ResizableTable,
  ResizableTableHeader,
  ResizableTableCell,
} from '../tiptap/ResizableTable';

export interface DefaultEditorExtensionsOptions {
  placeholder?: string;
  tableCellMinWidth?: number;
  headingLevels?: (1 | 2 | 3 | 4 | 5 | 6)[];
}

export function createDefaultEditorExtensions(options?: DefaultEditorExtensionsOptions) {
  return [
    StarterKit.configure({
      heading: {
        levels: options?.headingLevels || [1, 2, 3],
      },
      bulletList: {
        keepMarks: true,
        keepAttributes: false,
      },
      orderedList: {
        keepMarks: true,
        keepAttributes: false,
      },
    }),
    Placeholder.configure({
      placeholder: options?.placeholder || '在此输入或编辑内容...',
    }),
    ResizableTable.configure({
      resizable: true,
      cellMinWidth: options?.tableCellMinWidth || 40,
    }),
    TableRow,
    ResizableTableHeader,
    ResizableTableCell,
    TextAlign.configure({
      types: ['heading', 'paragraph'],
    }),
    TextStyle,
    Color,
    Highlight.configure({
      multicolor: true,
    }),
  ];
}
