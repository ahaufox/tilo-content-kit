/**
 * rich-editor.spec.tsx — RichEditor 受控双向同步与快捷键测试
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
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
});
