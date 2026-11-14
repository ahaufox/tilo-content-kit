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
import React, { useState, useEffect } from 'react';
import type { Editor } from '@tiptap/core';
import {
  IconBold,
  IconItalic,
  IconStrike,
  IconCode,
  IconH1,
  IconH2,
  IconH3,
  IconAlignLeft,
  IconAlignCenter,
  IconAlignRight,
  IconListBullet,
  IconListOrdered,
  IconBlockquote,
  IconTable,
  IconPalette,
  IconHighlighter,
  IconMinus,
  IconUndo,
  IconRedo,
  IconArrowUp,
  IconArrowDown,
  IconArrowLeft,
  IconArrowRight,
  IconTrash,
} from './icons';
import { ColorPicker } from './ColorPicker';
import type { ColorOption } from './colors';

export interface EditorToolbarProps {
  editor: Editor;
  extraActions?: React.ReactNode;
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

export function EditorToolbar({
  editor,
  extraActions,
  disabled = false,
  className = '',
  dataTestId,
  textColors,
  highlightColors,
  btnActiveClass,
  multiline = false,
}: EditorToolbarProps) {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!editor || (editor as any).isDestroyed) return;
    if (typeof editor.on !== 'function') return;

    const handleUpdate = () => {
      setTick((v) => (v + 1) % 1_000_000);
    };

    editor.on('transaction', handleUpdate);
    editor.on('selectionUpdate', handleUpdate);

    return () => {
      if (typeof editor.off === 'function') {
        editor.off('transaction', handleUpdate);
        editor.off('selectionUpdate', handleUpdate);
      }
    };
  }, [editor]);

  if (!editor) return null;

  const isBold = editor.isActive('bold');
  const isItalic = editor.isActive('italic');
  const isStrike = editor.isActive('strike');
  const isCode = editor.isActive('code');
  const isH1 = editor.isActive('heading', { level: 1 });
  const isH2 = editor.isActive('heading', { level: 2 });
  const isH3 = editor.isActive('heading', { level: 3 });
  const isAlignLeft = editor.isActive({ textAlign: 'left' });
  const isAlignCenter = editor.isActive({ textAlign: 'center' });
  const isAlignRight = editor.isActive({ textAlign: 'right' });
  const isBulletList = editor.isActive('bulletList');
  const isOrderedList = editor.isActive('orderedList');
  const isBlockquote = editor.isActive('blockquote');
  const isTableActive = editor.isActive('table');

  const activeTailwind = btnActiveClass ?? 'bg-amber-100 dark:bg-amber-900/50';
  const btnClass = (active: boolean) =>
    `tk-toolbar-btn ${active ? `tk-toolbar-btn--active ${activeTailwind}` : ''}`;

  const modeClass = multiline ? 'tk-toolbar--wrap' : 'tk-toolbar--scroll';

  return (
    <div
      data-testid={dataTestId || 'editor-toolbar'}
      className={`tk-toolbar ${modeClass} ${className}`.trim()}
      role="toolbar"
      aria-label="富文本格式工具栏"
    >
      <div className="tk-toolbar-scroll-container">
        <div className="tk-toolbar-inner">
          {/* 1. 基础字形格式组 */}
          <div className="tk-toolbar-group" role="group" aria-label="文字样式">
            <button
              type="button"
              title="加粗 (Ctrl+B)"
              disabled={disabled}
              data-testid="toolbar-btn-bold"
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={btnClass(isBold)}
            >
              <IconBold />
            </button>

            <button
              type="button"
              title="斜体 (Ctrl+I)"
              disabled={disabled}
              data-testid="toolbar-btn-italic"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={btnClass(isItalic)}
            >
              <IconItalic />
            </button>

            <button
              type="button"
              title="删除线"
              disabled={disabled}
              data-testid="toolbar-btn-strike"
              onClick={() => editor.chain().focus().toggleStrike().run()}
              className={btnClass(isStrike)}
            >
              <IconStrike />
            </button>

            <button
              type="button"
              title="行内代码"
              disabled={disabled}
              data-testid="toolbar-btn-code"
              onClick={() => editor.chain().focus().toggleCode().run()}
              className={btnClass(isCode)}
            >
              <IconCode />
            </button>
          </div>

          {/* 2. 颜色与高亮组 */}
          <div className="tk-toolbar-group" role="group" aria-label="颜色与高亮">
            <ColorPicker
              editor={editor}
              type="text"
              title="文字颜色"
              disabled={disabled}
              colors={textColors}
              trigger={<IconPalette />}
            />

            <ColorPicker
              editor={editor}
              type="highlight"
              title="文本高亮"
              disabled={disabled}
              colors={highlightColors}
              trigger={<IconHighlighter />}
            />
          </div>

          <div className="tk-toolbar-divider" />

          {/* 3. 标题层级组 */}
          <div className="tk-toolbar-group" role="group" aria-label="标题层级">
            <button
              type="button"
              title="一级标题"
              disabled={disabled}
              data-testid="toolbar-btn-h1"
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              className={btnClass(isH1)}
            >
              <IconH1 />
            </button>

            <button
              type="button"
              title="二级标题"
              disabled={disabled}
              data-testid="toolbar-btn-h2"
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              className={btnClass(isH2)}
            >
              <IconH2 />
            </button>

            <button
              type="button"
              title="三级标题"
              disabled={disabled}
              data-testid="toolbar-btn-h3"
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              className={btnClass(isH3)}
            >
              <IconH3 />
            </button>
          </div>

          <div className="tk-toolbar-divider" />

          {/* 4. 对齐方式组 */}
          <div className="tk-toolbar-group" role="group" aria-label="对齐方式">
            <button
              type="button"
              title="左对齐"
              disabled={disabled}
              data-testid="toolbar-btn-align-left"
              onClick={() => (editor.chain().focus() as any).setTextAlign?.('left')?.run?.()}
              className={btnClass(isAlignLeft)}
            >
              <IconAlignLeft />
            </button>

            <button
              type="button"
              title="居中对齐"
              disabled={disabled}
              data-testid="toolbar-btn-align-center"
              onClick={() => (editor.chain().focus() as any).setTextAlign?.('center')?.run?.()}
              className={btnClass(isAlignCenter)}
            >
              <IconAlignCenter />
            </button>

            <button
              type="button"
              title="右对齐"
              disabled={disabled}
              data-testid="toolbar-btn-align-right"
              onClick={() => (editor.chain().focus() as any).setTextAlign?.('right')?.run?.()}
              className={btnClass(isAlignRight)}
            >
              <IconAlignRight />
            </button>
          </div>

          <div className="tk-toolbar-divider" />

          {/* 5. 列表与引用组 */}
          <div className="tk-toolbar-group" role="group" aria-label="列表与引用">
            <button
              type="button"
              title="无序列表"
              disabled={disabled}
              data-testid="toolbar-btn-bullet"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={btnClass(isBulletList)}
            >
              <IconListBullet />
            </button>

            <button
              type="button"
              title="有序列表"
              disabled={disabled}
              data-testid="toolbar-btn-ordered"
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={btnClass(isOrderedList)}
            >
              <IconListOrdered />
            </button>

            <button
              type="button"
              title="引用块"
              disabled={disabled}
              data-testid="toolbar-btn-blockquote"
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              className={btnClass(isBlockquote)}
            >
              <IconBlockquote />
            </button>
          </div>

          <div className="tk-toolbar-divider" />

          {/* 6. 表格与分割线组 */}
          <div className="tk-toolbar-group" role="group" aria-label="表格与分割线">
            <button
              type="button"
              title={isTableActive ? '当前已在表格中' : '插入表格 (3x3)'}
              disabled={disabled}
              data-testid="toolbar-btn-table"
              onClick={() => {
                if (!isTableActive) {
                  editor
                    .chain()
                    .focus()
                    .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                    .run();
                }
              }}
              className={btnClass(isTableActive)}
            >
              <IconTable />
            </button>

            {isTableActive && (
              <div className="tk-toolbar-table-actions" data-testid="toolbar-table-actions">
                <button
                  type="button"
                  title="上方插入行"
                  onClick={() => editor.chain().focus().addRowBefore().run()}
                  className="tk-toolbar-mini-btn"
                >
                  <IconArrowUp />
                </button>
                <button
                  type="button"
                  title="下方插入行"
                  onClick={() => editor.chain().focus().addRowAfter().run()}
                  className="tk-toolbar-mini-btn"
                >
                  <IconArrowDown />
                </button>
                <button
                  type="button"
                  title="左侧插入列"
                  onClick={() => editor.chain().focus().addColumnBefore().run()}
                  className="tk-toolbar-mini-btn"
                >
                  <IconArrowLeft />
                </button>
                <button
                  type="button"
                  title="右侧插入列"
                  onClick={() => editor.chain().focus().addColumnAfter().run()}
                  className="tk-toolbar-mini-btn"
                >
                  <IconArrowRight />
                </button>
                <button
                  type="button"
                  title="删除表格"
                  onClick={() => editor.chain().focus().deleteTable().run()}
                  className="tk-toolbar-mini-btn tk-toolbar-mini-btn--danger"
                >
                  <IconTrash />
                </button>
              </div>
            )}

            <button
              type="button"
              title="插入分割线"
              disabled={disabled}
              data-testid="toolbar-btn-hr"
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
              className={btnClass(false)}
            >
              <IconMinus />
            </button>
          </div>

          <div className="tk-toolbar-divider" />

          {/* 7. 撤销与重做组 */}
          <div className="tk-toolbar-group" role="group" aria-label="历史撤销重做">
            <button
              type="button"
              title="撤销 (Ctrl+Z)"
              disabled={disabled || !editor.can().undo()}
              data-testid="toolbar-btn-undo"
              onClick={() => editor.chain().focus().undo().run()}
              className={btnClass(false)}
            >
              <IconUndo />
            </button>

            <button
              type="button"
              title="重做 (Ctrl+Y)"
              disabled={disabled || !editor.can().redo()}
              data-testid="toolbar-btn-redo"
              onClick={() => editor.chain().focus().redo().run()}
              className={btnClass(false)}
            >
              <IconRedo />
            </button>
          </div>
        </div>
      </div>

      {/* 右侧扩展操作插槽（常驻吸附，不被滚走） */}
      {extraActions && <div className="tk-toolbar-extra">{extraActions}</div>}
    </div>
  );
}
