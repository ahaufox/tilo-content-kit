/**
 * TableBubbleMenu — 表格上下文浮动气泡菜单
 *
 * 职责：当光标处于表格单元格内部时自动浮现，提供行/列新增与删除及整表删除操作。
 * 设计边界：
 *   1. 零外部 UI / 图标库依赖，纯原生内联 SVG 图标驱动；
 *   2. 样式完全消费随包 `--tk-*` CSS 变量，支持浅色与暗黑模式；
 *   3. 挂载于 Tiptap BubbleMenu，宿主可通过开关属性自主控制启用/关闭。
 */
import React from 'react';
import { BubbleMenu } from '@tiptap/react/menus';
import type { Editor } from '@tiptap/core';
import {
  IconTable,
  IconArrowUp,
  IconArrowDown,
  IconArrowLeft,
  IconArrowRight,
  IconTrash,
} from './icons';

export interface TableBubbleMenuProps {
  editor: Editor;
  className?: string;
}

export function TableBubbleMenu({ editor, className = '' }: TableBubbleMenuProps) {
  if (!editor) return null;

  return (
    <BubbleMenu
      editor={editor}
      shouldShow={({ editor: currentEditor }) => currentEditor.isActive('table')}
      className={`tk-table-bubble-menu ${className}`.trim()}
    >
      <div className="tk-table-bubble-menu__label">
        <IconTable width={14} height={14} />
        <span>表格</span>
      </div>

      {/* 行操作 */}
      <button
        type="button"
        title="在上方插入行"
        data-testid="table-menu-add-row-before"
        onClick={() => editor.chain().focus().addRowBefore().run()}
        className="tk-table-bubble-menu__btn"
      >
        <IconArrowUp width={13} height={13} />
        <span>上插行</span>
      </button>

      <button
        type="button"
        title="在下方插入行"
        data-testid="table-menu-add-row-after"
        onClick={() => editor.chain().focus().addRowAfter().run()}
        className="tk-table-bubble-menu__btn"
      >
        <IconArrowDown width={13} height={13} />
        <span>下插行</span>
      </button>

      <button
        type="button"
        title="删除当前行"
        data-testid="table-menu-delete-row"
        onClick={() => editor.chain().focus().deleteRow().run()}
        className="tk-table-bubble-menu__btn tk-table-bubble-menu__btn--danger"
      >
        <IconTrash width={13} height={13} />
        <span>删行</span>
      </button>

      <div className="tk-table-bubble-menu__divider" />

      {/* 列操作 */}
      <button
        type="button"
        title="在左侧插入列"
        data-testid="table-menu-add-col-before"
        onClick={() => editor.chain().focus().addColumnBefore().run()}
        className="tk-table-bubble-menu__btn"
      >
        <IconArrowLeft width={13} height={13} />
        <span>左插列</span>
      </button>

      <button
        type="button"
        title="在右侧插入列"
        data-testid="table-menu-add-col-after"
        onClick={() => editor.chain().focus().addColumnAfter().run()}
        className="tk-table-bubble-menu__btn"
      >
        <IconArrowRight width={13} height={13} />
        <span>右插列</span>
      </button>

      <button
        type="button"
        title="删除当前列"
        data-testid="table-menu-delete-col"
        onClick={() => editor.chain().focus().deleteColumn().run()}
        className="tk-table-bubble-menu__btn tk-table-bubble-menu__btn--danger"
      >
        <IconTrash width={13} height={13} />
        <span>删列</span>
      </button>

      <div className="tk-table-bubble-menu__divider" />

      {/* 整表操作 */}
      <button
        type="button"
        title="删除整个表格"
        data-testid="table-menu-delete-table"
        onClick={() => editor.chain().focus().deleteTable().run()}
        className="tk-table-bubble-menu__btn tk-table-bubble-menu__btn--danger"
      >
        <IconTrash width={14} height={14} />
        <span>删表</span>
      </button>
    </BubbleMenu>
  );
}

export default TableBubbleMenu;
