/**
 * table-bubble-menu.spec.tsx — TableBubbleMenu 气泡菜单行为测试
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

vi.mock('@tiptap/react/menus', () => ({
  BubbleMenu: ({ children, shouldShow, editor, className }: any) => {
    const show = shouldShow ? shouldShow({ editor }) : true;
    if (!show) return null;
    return <div className={className} data-testid="table-bubble-menu-root">{children}</div>;
  },
}));

import { TableBubbleMenu } from '../src/editor/TableBubbleMenu';

describe('TableBubbleMenu', () => {
  function createMockEditor(isActiveTable = true) {
    const chainFocusMock = {
      addRowBefore: vi.fn().mockReturnThis(),
      addRowAfter: vi.fn().mockReturnThis(),
      deleteRow: vi.fn().mockReturnThis(),
      addColumnBefore: vi.fn().mockReturnThis(),
      addColumnAfter: vi.fn().mockReturnThis(),
      deleteColumn: vi.fn().mockReturnThis(),
      deleteTable: vi.fn().mockReturnThis(),
      run: vi.fn(),
    };

    return {
      isActive: vi.fn((name: string) => name === 'table' && isActiveTable),
      chain: vi.fn(() => ({
        focus: vi.fn(() => chainFocusMock),
      })),
      registerPlugin: vi.fn(),
      unregisterPlugin: vi.fn(),
      _chainFocus: chainFocusMock,
    } as any;
  }

  it('渲染表格操作按钮（插行、插列、删行、删列、删表）', () => {
    const mockEditor = createMockEditor(true);
    render(<TableBubbleMenu editor={mockEditor} />);

    expect(screen.getByTestId('table-bubble-menu-root')).toBeTruthy();
    expect(screen.getByTestId('table-menu-add-row-before')).toBeTruthy();
    expect(screen.getByTestId('table-menu-add-row-after')).toBeTruthy();
    expect(screen.getByTestId('table-menu-delete-row')).toBeTruthy();
    expect(screen.getByTestId('table-menu-add-col-before')).toBeTruthy();
    expect(screen.getByTestId('table-menu-add-col-after')).toBeTruthy();
    expect(screen.getByTestId('table-menu-delete-col')).toBeTruthy();
    expect(screen.getByTestId('table-menu-delete-table')).toBeTruthy();
  });

  it('光标不在表格内时 (isActive=false) 隐藏气泡菜单', () => {
    const mockEditor = createMockEditor(false);
    render(<TableBubbleMenu editor={mockEditor} />);

    expect(screen.queryByTestId('table-bubble-menu-root')).toBeNull();
  });

  it('点击操作按钮正确触发 editor 命令流水线', () => {
    const mockEditor = createMockEditor(true);
    render(<TableBubbleMenu editor={mockEditor} />);

    // 点击上插行
    fireEvent.click(screen.getByTestId('table-menu-add-row-before'));
    expect(mockEditor._chainFocus.addRowBefore).toHaveBeenCalled();
    expect(mockEditor._chainFocus.run).toHaveBeenCalled();

    // 点击下插行
    fireEvent.click(screen.getByTestId('table-menu-add-row-after'));
    expect(mockEditor._chainFocus.addRowAfter).toHaveBeenCalled();

    // 点击删行
    fireEvent.click(screen.getByTestId('table-menu-delete-row'));
    expect(mockEditor._chainFocus.deleteRow).toHaveBeenCalled();

    // 点击左插列
    fireEvent.click(screen.getByTestId('table-menu-add-col-before'));
    expect(mockEditor._chainFocus.addColumnBefore).toHaveBeenCalled();

    // 点击右插列
    fireEvent.click(screen.getByTestId('table-menu-add-col-after'));
    expect(mockEditor._chainFocus.addColumnAfter).toHaveBeenCalled();

    // 点击删列
    fireEvent.click(screen.getByTestId('table-menu-delete-col'));
    expect(mockEditor._chainFocus.deleteColumn).toHaveBeenCalled();

    // 点击删表
    fireEvent.click(screen.getByTestId('table-menu-delete-table'));
    expect(mockEditor._chainFocus.deleteTable).toHaveBeenCalled();
  });
});
