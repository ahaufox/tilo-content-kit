/**
 * ColorPicker — 编辑器纯原生颜色选择器下拉组件
 *
 * 职责：提供轻量、零依赖的文字颜色与高亮画笔选择面板。
 * 纯原生 DOM 事件与 `--tk-*` CSS 变量驱动，自适应浅深色模式。
 */
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { Editor } from '@tiptap/core';
import {
  DEFAULT_TEXT_COLORS,
  DEFAULT_HIGHLIGHT_COLORS,
  type ColorOption,
} from './colors';

export interface ColorPickerProps {
  editor: Editor;
  type: 'text' | 'highlight';
  trigger: React.ReactNode;
  colors?: ColorOption[];
  title?: string;
  disabled?: boolean;
  className?: string;
  dataTestId?: string;
}

export function ColorPicker({
  editor,
  type,
  trigger,
  colors,
  title,
  disabled = false,
  className = '',
  dataTestId,
}: ColorPickerProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const colorList = colors || (type === 'text' ? DEFAULT_TEXT_COLORS : DEFAULT_HIGHLIGHT_COLORS);

  const updateCoords = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const popoverWidth = 260;
      let left = rect.left;
      if (typeof window !== 'undefined' && left + popoverWidth > window.innerWidth - 8) {
        left = Math.max(8, window.innerWidth - popoverWidth - 8);
      }
      setCoords({
        top: rect.bottom + 4,
        left,
      });
    }
  };

  const toggleOpen = () => {
    if (disabled) return;
    if (!open) {
      updateCoords();
      setOpen(true);
    } else {
      setOpen(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current && triggerRef.current.contains(target)) {
        return;
      }
      if (popoverRef.current && popoverRef.current.contains(target)) {
        return;
      }
      setOpen(false);
    };

    const handleScrollOrResize = () => {
      updateCoords();
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [open]);

  const handleSelect = (colorVal: string) => {
    if (disabled || !editor) return;
    const chain = editor.chain().focus() as any;
    if (type === 'text') {
      if (typeof chain.setColor === 'function') {
        chain.setColor(colorVal).run();
      }
    } else {
      if (typeof chain.toggleHighlight === 'function') {
        chain.toggleHighlight({ color: colorVal }).run();
      }
    }
    setOpen(false);
  };

  const handleClear = () => {
    if (disabled || !editor) return;
    const chain = editor.chain().focus() as any;
    if (type === 'text') {
      if (typeof chain.unsetColor === 'function') {
        chain.unsetColor().run();
      }
    } else {
      if (typeof chain.unsetHighlight === 'function') {
        chain.unsetHighlight().run();
      }
    }
    setOpen(false);
  };

  const clearLabel = type === 'text' ? '默认' : '清除';
  const clearTitle = type === 'text' ? '恢复默认文字颜色' : '清除文本高亮';
  const isActive = Boolean(
    editor &&
      (type === 'text'
        ? (editor.isActive?.('textStyle') && (editor.getAttributes?.('textStyle')?.color))
        : editor.isActive?.('highlight')),
  );
  const testId = dataTestId || (type === 'text' ? 'toolbar-btn-color-text' : 'toolbar-btn-color-highlight');

  const popoverContent = open && typeof document !== 'undefined' ? (
    createPortal(
      <div
        ref={popoverRef}
        className="tk-color-popover"
        role="menu"
        data-testid={`${testId}-popover`}
        style={{
          position: 'fixed',
          top: `${coords.top}px`,
          left: `${coords.left}px`,
          zIndex: 9999,
        }}
      >
        <div className="tk-color-swatches">
          {colorList.map((c) => (
            <button
              key={c.name}
              type="button"
              title={c.name}
              data-testid={`color-swatch-${c.name}`}
              onClick={() => handleSelect(c.value)}
              className={`tk-color-swatch ${type === 'highlight' ? 'tk-color-swatch--rect' : ''}`}
              style={{ backgroundColor: c.value }}
            />
          ))}
        </div>
        <button
          type="button"
          title={clearTitle}
          data-testid={`${testId}-clear`}
          onClick={handleClear}
          className="tk-color-clear-btn"
        >
          {clearLabel}
        </button>
      </div>,
      document.body,
    )
  ) : null;

  return (
    <div className={`tk-color-picker ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        title={title}
        disabled={disabled}
        data-testid={testId}
        onClick={toggleOpen}
        className={`tk-toolbar-btn ${isActive ? 'tk-toolbar-btn--active bg-amber-100 dark:bg-amber-900/50' : ''}`}
        aria-haspopup="true"
        aria-expanded={open}
      >
        {trigger}
      </button>

      {popoverContent}
    </div>
  );
}
