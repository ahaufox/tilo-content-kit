/**
 * rich-editor.spec.tsx — RichEditor 受控双向同步与快捷键测试
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

vi.mock('@tiptap/react/menus', () => ({
  BubbleMenu: ({ children, className }: any) => {
    return <div className={className} data-testid="table-bubble-menu-root">{children}</div>;
  },
}));

import { RichEditor } from '../src/editor';

describe('RichEditor', () => {
  it('正确渲染编辑器容器与工具栏', () => {
    render(<RichEditor value="测试初始内容" placeholder="请输入..." />);

    expect(screen.getByTestId('tk-rich-editor')).toBeTruthy();
    expect(screen.getByTestId('editor-toolbar')).toBeTruthy();
    expect(screen.getByTestId('tk-rich-editor-content')).toBeTruthy();
  });

  it('showToolbar=false 时隐藏工具栏', () => {
    render(<RichEditor value="内容" showToolbar={false} />);

    expect(screen.getByTestId('tk-rich-editor')).toBeTruthy();
    expect(screen.queryByTestId('editor-toolbar')).toBeNull();
  });

  it('拦截 Ctrl+S / Cmd+S 触发 onSaveShortcut', () => {
    const onSave = vi.fn();
    render(<RichEditor value="文书初稿" onSaveShortcut={onSave} />);

    const editorEl = screen.getByTestId('tk-rich-editor-content');
    fireEvent.keyDown(editorEl, { key: 's', ctrlKey: true });

    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('拦截 Escape 触发 onCancelShortcut', () => {
    const onCancel = vi.fn();
    render(<RichEditor value="文书初稿" onCancelShortcut={onCancel} />);

    const editorEl = screen.getByTestId('tk-rich-editor-content');
    fireEvent.keyDown(editorEl, { key: 'Escape' });

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('透传 multilineToolbar 属性给 EditorToolbar', () => {
    render(<RichEditor value="内容" multilineToolbar={true} />);

    const toolbar = screen.getByTestId('editor-toolbar');
    expect(toolbar.className).toContain('tk-toolbar--wrap');
  });

  it('支持 heightMode 与 isDragging 样式类控制', () => {
    const { rerender } = render(
      <RichEditor value="内容" heightMode="full" isDragging={true} />
    );

    const box = screen.getByTestId('tk-rich-editor');
    expect(box.className).toContain('tk-editor-box--full');
    expect(box.className).toContain('tk-editor-box--dragging');

    rerender(<RichEditor value="内容" heightMode="auto" isDragging={false} />);
    expect(box.className).toContain('tk-editor-box--auto');
    expect(box.className).not.toContain('tk-editor-box--dragging');
  });

  it('renderHiddenTextarea=true 时正确渲染无障碍隐藏 textarea', () => {
    render(<RichEditor value="表单数据" renderHiddenTextarea={true} />);

    const textarea = screen.getByTestId('tk-rich-editor-native-textarea');
    expect(textarea).toBeTruthy();
    expect((textarea as HTMLTextAreaElement).value).toBe('表单数据');
  });

  it('外层容器支持挂载 DOM value 描述符驱动双向更新', () => {
    const onChange = vi.fn();
    render(<RichEditor value="初始文本" onChange={onChange} />);

    const container = screen.getByTestId('tk-rich-editor') as any;
    expect(container.value).toBe('初始文本');

    // 模拟测试框架 fireEvent.change 变更 container.value
    container.value = '通过 DOM 描述符更新';
    expect(onChange).toHaveBeenCalledWith('通过 DOM 描述符更新');
  });

  it('showTableBubbleMenu 开关控制：默认渲染气泡菜单组件，传 false 时彻底关闭', () => {
    const { rerender } = render(
      <RichEditor
        value="| a | b |\n|---|---|\n| 1 | 2 |"
        showTableBubbleMenu={true}
      />
    );

    // 默认开启时，气泡菜单根节点应该存在于 DOM 中
    expect(document.querySelector('.tk-table-bubble-menu')).toBeTruthy();

    // 显式传 false 时，彻底不渲染气泡菜单
    rerender(
      <RichEditor
        value="| a | b |\n|---|---|\n| 1 | 2 |"
        showTableBubbleMenu={false}
      />
    );
    expect(document.querySelector('.tk-table-bubble-menu')).toBeNull();
  });
});
