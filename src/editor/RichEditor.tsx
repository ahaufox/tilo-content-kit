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
import { ensureHtml, htmlToMarkdown } from '../convert';
import { createDefaultEditorExtensions, type DefaultEditorExtensionsOptions } from './defaultExtensions';
import { EditorToolbar } from './EditorToolbar';
import type { ColorOption } from './colors';

export interface RichEditorProps {
  value?: string;
  onChange?: (markdown: string) => void;
  onChangeHtml?: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  showToolbar?: boolean;
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
}

export function RichEditor({
  value = '',
  onChange,
  onChangeHtml,
  placeholder,
  disabled = false,
  autoFocus = false,
  showToolbar = true,
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
    onUpdate: ({ editor }) => {
      isUpdatingFromEditorRef.current = true;
      const html = editor.getHTML();
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

  return (
    <div
      data-testid={dataTestId}
      className={`tk-editor-box ${disabled ? 'tk-editor-box--disabled' : ''} ${className}`}
    >
      {showToolbar && editor && (
        <EditorToolbar
          editor={editor}
          disabled={disabled}
          extraActions={extraToolbarActions}
          textColors={textColors}
          highlightColors={highlightColors}
          multiline={multilineToolbar}
        />
      )}
      <div className="tk-editor-area">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
