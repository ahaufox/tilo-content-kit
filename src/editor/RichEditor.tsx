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
import React, { useRef, useEffect, useMemo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import type { Editor } from '@tiptap/core';
import { ensureHtml, htmlToMarkdown } from '../convert';
import { createDefaultEditorExtensions, type DefaultEditorExtensionsOptions } from './defaultExtensions';
import { EditorToolbar } from './EditorToolbar';
import { TableBubbleMenu } from './TableBubbleMenu';
import type { ColorOption } from './colors';

export interface RichEditorProps {
  value?: string;
  onChange?: (markdown: string) => void;
  onChangeHtml?: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  showToolbar?: boolean;
  toolbarDataTestId?: string;
  extraToolbarActions?: React.ReactNode;
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
  /** 是否启用表格上下文浮动气泡菜单（光标位于表格单元格内时浮出快捷操作），默认 true，传 false 彻底关闭 */
  showTableBubbleMenu?: boolean;
  /** 高度排版模式：'full' 弹性撑满父容器 | 'auto' 随内容高度自适应 | 'fixed' 受 minHeight 约束，默认 'auto' */
  heightMode?: 'full' | 'auto' | 'fixed';
  /** 编辑区最小高度（数值默认转为 px，亦可传 '260px' 等字符串） */
  minHeight?: number | string;
  /** 文件拖拽悬浮态感知（为 true 时外边框呈现高亮环） */
  isDragging?: boolean;
  /** 是否渲染隐藏的 Native textarea 桥接（用于无障碍屏幕阅读器与传统表单提交） */
  renderHiddenTextarea?: boolean;
  /** 是否展示底部栏 */
  showFooter?: boolean;
  /** 自定义底部栏渲染函数 */
  renderFooter?: (editor: Editor) => React.ReactNode;
}

export function RichEditor({
  value = '',
  onChange,
  onChangeHtml,
  placeholder,
  disabled = false,
  autoFocus = false,
  showToolbar = true,
  toolbarDataTestId,
  extraToolbarActions,
  onSaveShortcut,
  onCancelShortcut,
  className = '',
  editorClassName = '',
  textColors,
  highlightColors,
  extensions,
  extensionOptions,
  dataTestId = 'tk-rich-editor',
  multilineToolbar = false,
  showTableBubbleMenu = true,
  heightMode = 'auto',
  minHeight,
  isDragging = false,
  renderHiddenTextarea = false,
  showFooter = false,
  renderFooter,
}: RichEditorProps) {
  const isUpdatingFromEditorRef = useRef(false);
  const onSaveShortcutRef = useRef(onSaveShortcut);
  const onCancelShortcutRef = useRef(onCancelShortcut);
  const lastSyncedValueRef = useRef(value);

  useEffect(() => {
    onSaveShortcutRef.current = onSaveShortcut;
    onCancelShortcutRef.current = onCancelShortcut;
  }, [onSaveShortcut, onCancelShortcut]);

  const editorExtensions = useMemo(() => {
    if (extensions && extensions.length > 0) return extensions;
    return createDefaultEditorExtensions({
      placeholder,
      ...extensionOptions,
    });
  }, [extensions, placeholder, extensionOptions]);

  const editor = useEditor({
    immediatelyRender: false,
    editable: !disabled,
    autofocus: autoFocus,
    extensions: editorExtensions,
    content: ensureHtml(value || ''),
    editorProps: {
      attributes: {
        'data-testid': `${dataTestId}-content`,
        class: `tk-content tk-editor-content ${editorClassName}`,
      },
      handleKeyDown: (_view, event) => {
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
          event.preventDefault();
          if (onSaveShortcutRef.current) {
            onSaveShortcutRef.current();
            return true;
          }
        }
        if (event.key === 'Escape') {
          if (onCancelShortcutRef.current) {
            onCancelShortcutRef.current();
            return true;
          }
        }
        return false;
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      isUpdatingFromEditorRef.current = true;
      const html = currentEditor.getHTML();
      const md = htmlToMarkdown(html);
      lastSyncedValueRef.current = md;

      onChange?.(md);
      onChangeHtml?.(html);

      queueMicrotask(() => {
        isUpdatingFromEditorRef.current = false;
      });
    },
  });

  // 同步 disabled 属性
  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      editor.setEditable(!disabled);
    }
  }, [editor, disabled]);

  // 当外部受控 value 发生实质变化时同步更新编辑器内容
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    if (isUpdatingFromEditorRef.current) return;

    const currentHtml = editor.getHTML();
    const currentMd = htmlToMarkdown(currentHtml);
    if (currentMd.trim() !== (value || '').trim()) {
      lastSyncedValueRef.current = value;
      editor.commands.setContent(ensureHtml(value || ''));
    }
  }, [editor, value]);

  // 在外层容器挂载 value 存取器描述符，方便测试框架与原生表单直接通过 container.value 交互
  const containerRef = useRef<HTMLDivElement>(null);
  const currentValRef = useRef(value || '');
  useEffect(() => {
    currentValRef.current = value || '';
  }, [value]);

  useEffect(() => {
    if (containerRef.current) {
      Object.defineProperty(containerRef.current, 'value', {
        get() {
          return currentValRef.current;
        },
        set(val: string) {
          currentValRef.current = val;
          if (editor && !editor.isDestroyed) {
            editor.commands.setContent(ensureHtml(val));
          }
          onChange?.(val);
        },
        configurable: true,
      });
    }
  }, [editor, onChange]);

  const minHeightStyle = typeof minHeight === 'number' ? `${minHeight}px` : minHeight;

  const boxClasses = [
    'tk-editor-box',
    disabled ? 'tk-editor-box--disabled' : '',
    heightMode === 'full' ? 'tk-editor-box--full' : '',
    heightMode === 'auto' ? 'tk-editor-box--auto' : '',
    isDragging ? 'tk-editor-box--dragging' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const areaClasses = [
    'tk-editor-area',
    heightMode === 'full' ? 'tk-editor-area--full' : '',
    heightMode === 'auto' ? 'tk-editor-area--auto' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      ref={containerRef}
      data-testid={dataTestId}
      className={boxClasses}
    >
      {showToolbar && editor && (
        <EditorToolbar
          editor={editor}
          disabled={disabled}
          extraActions={extraToolbarActions}
          textColors={textColors}
          highlightColors={highlightColors}
          multiline={multilineToolbar}
          dataTestId={toolbarDataTestId || 'editor-toolbar'}
        />
      )}
      <div
        className={areaClasses}
        style={{ minHeight: minHeightStyle }}
      >
        {showTableBubbleMenu && editor && (
          <TableBubbleMenu editor={editor} />
        )}
        <EditorContent
          editor={editor}
          className="tk-editor-content-host"
        />
      </div>
      {showFooter && editor && renderFooter && (
        <div className="tk-editor-footer">
          {renderFooter(editor)}
        </div>
      )}
      {renderHiddenTextarea && (
        <textarea
          tabIndex={-1}
          aria-hidden="true"
          placeholder={placeholder || '在此输入或编辑内容...'}
          value={value || ''}
          onChange={(e) => {
            if (editor && !editor.isDestroyed) {
              editor.commands.setContent(ensureHtml(e.target.value));
            }
            onChange?.(e.target.value);
          }}
          className="tk-editor-hidden-textarea"
          data-testid={`${dataTestId}-native-textarea`}
        />
      )}
    </div>
  );
}
