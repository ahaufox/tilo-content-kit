/**
 * editor-toolbar.spec.tsx — EditorToolbar 与 ColorPicker 单元测试
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { EditorToolbar, ColorPicker } from '../src/editor';

function createMockEditor(overrides: Record<string, any> = {}) {
  const listeners: Record<string, Function[]> = {};
  const chainMock = {
    focus: vi.fn().mockReturnThis(),
    toggleBold: vi.fn().mockReturnThis(),
    toggleItalic: vi.fn().mockReturnThis(),
    toggleStrike: vi.fn().mockReturnThis(),
    toggleCode: vi.fn().mockReturnThis(),
    toggleHeading: vi.fn().mockReturnThis(),
    setTextAlign: vi.fn().mockReturnThis(),
    toggleBulletList: vi.fn().mockReturnThis(),
    toggleOrderedList: vi.fn().mockReturnThis(),
    toggleBlockquote: vi.fn().mockReturnThis(),
    insertTable: vi.fn().mockReturnThis(),
    addRowBefore: vi.fn().mockReturnThis(),
    addRowAfter: vi.fn().mockReturnThis(),
    addColumnBefore: vi.fn().mockReturnThis(),
    addColumnAfter: vi.fn().mockReturnThis(),
    deleteTable: vi.fn().mockReturnThis(),
    setHorizontalRule: vi.fn().mockReturnThis(),
    setColor: vi.fn().mockReturnThis(),
    unsetColor: vi.fn().mockReturnThis(),
    toggleHighlight: vi.fn().mockReturnThis(),
    unsetHighlight: vi.fn().mockReturnThis(),
    undo: vi.fn().mockReturnThis(),
    redo: vi.fn().mockReturnThis(),
    run: vi.fn().mockReturnValue(true),
  };

  const editor: any = {
    isActive: vi.fn().mockReturnValue(false),
    can: vi.fn().mockReturnValue({ undo: () => true, redo: () => true }),
    chain: vi.fn().mockReturnValue(chainMock),
    on: vi.fn((event: string, fn: Function) => {
      listeners[event] = listeners[event] || [];
      listeners[event].push(fn);
      return editor;
    }),
    off: vi.fn((event: string, fn: Function) => {
      listeners[event] = (listeners[event] || []).filter((cb) => cb !== fn);
      return editor;
    }),
    emit: (event: string, ...args: any[]) => {
      (listeners[event] || []).forEach((cb) => cb(...args));
    },
    ...overrides,
  };

  return editor;
}

describe('EditorToolbar', () => {
  it('正确渲染全套格式化按钮与颜色设置入口', () => {
    const editor = createMockEditor();
    render(<EditorToolbar editor={editor} />);

    expect(screen.getByTestId('editor-toolbar')).toBeTruthy();
    expect(screen.getByTestId('toolbar-btn-bold')).toBeTruthy();
    expect(screen.getByTestId('toolbar-btn-italic')).toBeTruthy();
    expect(screen.getByTestId('toolbar-btn-strike')).toBeTruthy();
    expect(screen.getByTestId('toolbar-btn-code')).toBeTruthy();

    // 颜色与高亮设置入口
    expect(screen.getByTitle('文字颜色')).toBeTruthy();
    expect(screen.getByTitle('文本高亮')).toBeTruthy();

    // 标题与对齐
    expect(screen.getByTestId('toolbar-btn-h1')).toBeTruthy();
    expect(screen.getByTestId('toolbar-btn-h2')).toBeTruthy();
    expect(screen.getByTestId('toolbar-btn-h3')).toBeTruthy();
    expect(screen.getByTestId('toolbar-btn-align-left')).toBeTruthy();
    expect(screen.getByTestId('toolbar-btn-align-center')).toBeTruthy();
    expect(screen.getByTestId('toolbar-btn-align-right')).toBeTruthy();

    // 列表与表格
    expect(screen.getByTestId('toolbar-btn-bullet')).toBeTruthy();
    expect(screen.getByTestId('toolbar-btn-ordered')).toBeTruthy();
    expect(screen.getByTestId('toolbar-btn-blockquote')).toBeTruthy();
    expect(screen.getByTestId('toolbar-btn-table')).toBeTruthy();
    expect(screen.getByTestId('toolbar-btn-hr')).toBeTruthy();
    expect(screen.getByTestId('toolbar-btn-undo')).toBeTruthy();
    expect(screen.getByTestId('toolbar-btn-redo')).toBeTruthy();
  });

  it('点击加粗按钮触发 toggleBold', () => {
    const editor = createMockEditor();
    render(<EditorToolbar editor={editor} />);

    fireEvent.click(screen.getByTestId('toolbar-btn-bold'));
    expect(editor.chain().focus().toggleBold().run).toHaveBeenCalled();
  });

  it('文字颜色：打开色板选择鲜红触发 setColor', () => {
    const editor = createMockEditor();
    render(<EditorToolbar editor={editor} />);

    const colorTrigger = screen.getByTitle('文字颜色');
    fireEvent.click(colorTrigger);

    // 色板展开，点击警示鲜红
    const redBtn = screen.getByTitle('警示鲜红');
    expect(redBtn).toBeTruthy();
    fireEvent.click(redBtn);

    expect(editor.chain().focus().setColor).toHaveBeenCalledWith('#ef4444');
  });

  it('文字颜色：点击恢复默认触发 unsetColor', () => {
    const editor = createMockEditor();
    render(<EditorToolbar editor={editor} />);

    fireEvent.click(screen.getByTitle('文字颜色'));
    const clearBtn = screen.getByTitle('恢复默认文字颜色');
    fireEvent.click(clearBtn);

    expect(editor.chain().focus().unsetColor).toHaveBeenCalled();
  });

  it('文本高亮：打开色板选择荧光黄触发 toggleHighlight，重置触发 unsetHighlight', () => {
    const editor = createMockEditor();
    render(<EditorToolbar editor={editor} />);

    fireEvent.click(screen.getByTitle('文本高亮'));
    const yellowBtn = screen.getByTitle('荧光黄');
    fireEvent.click(yellowBtn);

    expect(editor.chain().focus().toggleHighlight).toHaveBeenCalledWith({ color: '#fef08a' });

    // 再次点击打开并清除
    fireEvent.click(screen.getByTitle('文本高亮'));
    const clearBtn = screen.getByTitle('清除文本高亮');
    fireEvent.click(clearBtn);

    expect(editor.chain().focus().unsetHighlight).toHaveBeenCalled();
  });

  it('表格激活状态下展开表格行列操作按钮条', () => {
    const editor = createMockEditor({
      isActive: (name: string) => name === 'table',
    });
    render(<EditorToolbar editor={editor} />);

    expect(screen.getByTestId('toolbar-table-actions')).toBeTruthy();
    const addRowBeforeBtn = screen.getByTitle('上方插入行');
    fireEvent.click(addRowBeforeBtn);
    expect(editor.chain().focus().addRowBefore().run).toHaveBeenCalled();

    const deleteTableBtn = screen.getByTitle('删除表格');
    fireEvent.click(deleteTableBtn);
    expect(editor.chain().focus().deleteTable().run).toHaveBeenCalled();
  });

  it('disabled 态下禁用所有控制按钮', () => {
    const editor = createMockEditor();
    render(<EditorToolbar editor={editor} disabled={true} />);

    expect(screen.getByTestId('toolbar-btn-bold').hasAttribute('disabled')).toBe(true);
    expect(screen.getByTitle('文字颜色').hasAttribute('disabled')).toBe(true);
    expect(screen.getByTitle('文本高亮').hasAttribute('disabled')).toBe(true);
  });

  it('默认采用单行平滑滚动排版模式 (tk-toolbar--scroll)', () => {
    const editor = createMockEditor();
    render(<EditorToolbar editor={editor} />);

    const toolbar = screen.getByTestId('editor-toolbar');
    expect(toolbar.className).toContain('tk-toolbar--scroll');
    expect(toolbar.querySelector('.tk-toolbar-scroll-container')).toBeTruthy();
    expect(toolbar.querySelectorAll('.tk-toolbar-group').length).toBeGreaterThan(0);
  });

  it('设置 multiline={true} 时采用多行自适应折行模式 (tk-toolbar--wrap)', () => {
    const editor = createMockEditor();
    render(<EditorToolbar editor={editor} multiline={true} />);

    const toolbar = screen.getByTestId('editor-toolbar');
    expect(toolbar.className).toContain('tk-toolbar--wrap');
  });

  it('渲染 extraActions 右侧常驻插槽', () => {
    const editor = createMockEditor();
    render(
      <EditorToolbar
        editor={editor}
        extraActions={<button data-testid="save-btn">保存文书</button>}
      />
    );

    const extra = screen.getByTestId('editor-toolbar').querySelector('.tk-toolbar-extra');
    expect(extra).toBeTruthy();
    expect(screen.getByTestId('save-btn')).toBeTruthy();
  });

  it('选区变动或事务发生时（selectionUpdate / transaction），toolbar 实时同步高亮状态', () => {
    let boldActive = false;
    let italicActive = false;
    const editor = createMockEditor({
      isActive: (name: string) => {
        if (name === 'bold') return boldActive;
        if (name === 'italic') return italicActive;
        return false;
      },
    });

    render(<EditorToolbar editor={editor} />);

    const boldBtn = screen.getByTestId('toolbar-btn-bold');
    const italicBtn = screen.getByTestId('toolbar-btn-italic');

    expect(boldBtn.className).not.toContain('tk-toolbar-btn--active');
    expect(italicBtn.className).not.toContain('tk-toolbar-btn--active');

    // 模拟光标移动到加粗文本
    boldActive = true;
    act(() => {
      editor.emit('selectionUpdate');
    });

    expect(boldBtn.className).toContain('tk-toolbar-btn--active');
    expect(italicBtn.className).not.toContain('tk-toolbar-btn--active');

    // 模拟光标移出加粗并进入斜体文本
    boldActive = false;
    italicActive = true;
    act(() => {
      editor.emit('transaction');
    });

    expect(boldBtn.className).not.toContain('tk-toolbar-btn--active');
    expect(italicBtn.className).toContain('tk-toolbar-btn--active');
  });
});
