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
import React, { useState, useRef, useEffect, useMemo } from 'react';
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
  /** 外层容器自定义内联样式（支持直接覆盖 CSS Token，如 --tk-radius-block） */
  style?: React.CSSProperties;
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
  /** 是否渲染隐藏的 Native textarea 桥接（用于原生表单集成与自动化测试桥接，带 aria-hidden="true" 与 tabIndex={-1}） */
  renderHiddenTextarea?: boolean;
  /** 是否展示底部栏 */
  showFooter?: boolean;
  /** 底部栏提示文本 */
  tipsText?: string;
  /** 自定义底部栏渲染函数 */
  renderFooter?: (editor: Editor) => React.ReactNode;
}

function getEditorCharCount(ed: Editor): number {
  return ed.getText({ blockSeparator: '' }).length;
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
  style,
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
  tipsText,
  renderFooter,
}: RichEditorProps) {
  const isUpdatingFromEditorRef = useRef(false);
  const onSaveShortcutRef = useRef(onSaveShortcut);
  const onCancelShortcutRef = useRef(onCancelShortcut);
  const showFooterRef = useRef(showFooter);
  const lastSyncedValueRef = useRef(value);
  const isFirstSyncRef = useRef(true);
  const isInitializedRef = useRef(false);
  const [charCount, setCharCount] = useState<number>(0);

  useEffect(() => {
    showFooterRef.current = showFooter;
  }, [showFooter]);

  useEffect(() => {
    // 挂载初次完成，在下个宏任务周期激活用户输入监听，杜绝挂载期 setEditable 触发偷发初值
    const timer = setTimeout(() => {
      isInitializedRef.current = true;
    }, 0);
    return () => clearTimeout(timer);
  }, []);

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
    onCreate: ({ editor: initialEditor }) => {
      if (showFooterRef.current) {
        setCharCount(getEditorCharCount(initialEditor));
      }
    },
    editorProps: {
      attributes: {
        'data-testid': `${dataTestId}-content`,
        class: `tk-content tk-editor-content ${editorClassName}`,
      },
      handleKeyDown: (_view, event) => {
        isInitializedRef.current = true;
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
      // 挂载初次完成前且未聚焦时，忽略内部初始化事务（如 setEditable 等触发），防多发初值
      if (!isInitializedRef.current && !currentEditor.isFocused) return;
      isInitializedRef.current = true;

      isUpdatingFromEditorRef.current = true;
      const html = currentEditor.getHTML();
      const md = htmlToMarkdown(html);
      lastSyncedValueRef.current = md;
      if (showFooterRef.current) {
        setCharCount(getEditorCharCount(currentEditor));
      }

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

  // 当外部受控 value 发生实质变化时同步更新编辑器内容（首轮挂载静默拉齐，防多发初值）
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    if (isFirstSyncRef.current) {
      isFirstSyncRef.current = false;
      lastSyncedValueRef.current = value || '';
      return;
    }
    if (isUpdatingFromEditorRef.current) return;

    const currentHtml = editor.getHTML();
    const currentMd = htmlToMarkdown(currentHtml);
    if (currentMd.trim() !== (value || '').trim()) {
      lastSyncedValueRef.current = value || '';
      editor.commands.setContent(ensureHtml(value || ''));
      if (showFooterRef.current) {
        setCharCount(getEditorCharCount(editor));
      }
    }
  }, [editor, value]);

  // 在外层容器挂载 value 存取器描述符，方便测试框架与原生表单直接通过 container.value 交互
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      Object.defineProperty(containerRef.current, 'value', {
        get() {
          if (editor && !editor.isDestroyed) {
            return htmlToMarkdown(editor.getHTML());
          }
          return lastSyncedValueRef.current;
        },
        set(val: string) {
          isInitializedRef.current = true;
          const stringVal = String(val ?? '');
          if (editor && !editor.isDestroyed) {
            // 显式传 { emitUpdate: false } 关断 Tiptap 内部 update 事件，由下方统一单次分发清洗后的标准 Markdown
            editor.commands.setContent(ensureHtml(stringVal), { emitUpdate: false });
            const cleanMd = htmlToMarkdown(editor.getHTML());
            lastSyncedValueRef.current = cleanMd;
            if (showFooterRef.current) {
              setCharCount(getEditorCharCount(editor));
            }
            onChange?.(cleanMd);
            onChangeHtml?.(editor.getHTML());
          } else {
            lastSyncedValueRef.current = stringVal;
            onChange?.(stringVal);
          }
        },
        configurable: true,
      });
    }
  }, [editor, onChange, onChangeHtml]);

  const minHeightStyle = typeof minHeight === 'number' ? `${minHeight}px` : minHeight;

  const boxClasses = [
    'tk-editor-box',
    disabled ? 'tk-editor-box--disabled' : '',
    heightMode === 'full' ? 'tk-editor-box--full' : '',
    heightMode === 'auto' ? 'tk-editor-box--auto' : '',
    heightMode === 'fixed' ? 'tk-editor-box--fixed' : '',
    isDragging ? 'tk-editor-box--dragging' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const areaClasses = [
    'tk-editor-area',
    heightMode === 'full' ? 'tk-editor-area--full' : '',
    heightMode === 'auto' ? 'tk-editor-area--auto' : '',
    heightMode === 'fixed' ? 'tk-editor-area--fixed' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const areaStyle: React.CSSProperties = {
    minHeight: minHeightStyle,
    ...(heightMode === 'fixed' && minHeightStyle ? { height: minHeightStyle, overflowY: 'auto' } : {}),
  };

  return (
    <div
      ref={containerRef}
      style={style}
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
        style={areaStyle}
        onClick={(e) => {
          if (!disabled && editor && !editor.isDestroyed) {
            // 点击发生在空白区时聚焦编辑器
            if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('tk-editor-area')) {
              editor.commands.focus();
            }
          }
        }}
      >
        {showTableBubbleMenu && editor && (
          <TableBubbleMenu editor={editor} />
        )}
        <EditorContent
          editor={editor}
          className="tk-editor-content-host"
        />
      </div>
      {showFooter && editor && (
        <div
          className="tk-editor-footer"
          data-testid={`${dataTestId}-footer`}
        >
          {renderFooter ? (
            renderFooter(editor)
          ) : (
            <>
              <div
                className="tk-editor-footer-tips"
                data-testid={`${dataTestId}-footer-tips`}
              >
                {tipsText || ''}
              </div>
              <div
                className="tk-editor-footer-count"
                data-testid={`${dataTestId}-char-count`}
              >
                {charCount} 字
              </div>
            </>
          )}
        </div>
      )}
      {renderHiddenTextarea && (
        <textarea
          tabIndex={-1}
          aria-hidden="true"
          placeholder={placeholder || '在此输入或编辑内容...'}
          value={value || ''}
          onChange={(e) => {
            isInitializedRef.current = true;
            const nextVal = e.target.value;
            if (editor && !editor.isDestroyed) {
              editor.commands.setContent(ensureHtml(nextVal), { emitUpdate: false });
              lastSyncedValueRef.current = nextVal;
              if (showFooterRef.current) {
                setCharCount(getEditorCharCount(editor));
              }
              onChange?.(nextVal);
              onChangeHtml?.(editor.getHTML());
            } else {
              lastSyncedValueRef.current = nextVal;
              onChange?.(nextVal);
            }
          }}
          className="tk-editor-hidden-textarea"
          data-testid={`${dataTestId}-native-textarea`}
        />
      )}
    </div>
  );
}
