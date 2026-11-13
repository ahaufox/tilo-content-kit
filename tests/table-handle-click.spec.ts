/**
 * tiptap/table/handle-click — 列边界手柄点击与拖拽识别行为测试
 *
 * 核心验证：
 * 1. 轻点（位移 < 5px 且 < 400ms）派发 TABLE_COLUMN_CLICK_EVENT 并携带完整有效载荷；
 * 2. 核心断点探针：mousedown 后即使手柄 DOM 被重建/脱离文档，mouseup 仍能根据闭包派发事件；
 * 3. 拖拽（位移 >= 5px 或耗时 >= 400ms）不派发事件；
 * 4. destroy() 后注销监听，无残留副作用。
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { TableRow } from '@tiptap/extension-table-row';
import {
  ResizableTable,
  ResizableTableCell,
  ResizableTableHeader,
  TABLE_COLUMN_CLICK_EVENT,
} from '../src/tiptap';

function createEditor(html: string) {
  return new Editor({
    extensions: [
      StarterKit.configure({
        undoRedo: false,
      }),
      ResizableTable.configure({
        resizable: true,
        handleWidth: 6,
        cellMinWidth: 80,
        lastColumnResizable: true,
      }),
      TableRow,
      ResizableTableHeader,
      ResizableTableCell,
    ],
    content: html,
  });
}

describe('table handle click plugin', () => {
  let editor: Editor;
  let mockTime = 10000;
  let receivedEvents: CustomEvent[] = [];

  const onTableColumnClick = (e: Event) => {
    receivedEvents.push(e as CustomEvent);
  };

  beforeEach(() => {
    mockTime = 10000;
    receivedEvents = [];
    vi.spyOn(Date, 'now').mockImplementation(() => mockTime);
    if (!document.elementFromPoint) {
      document.elementFromPoint = vi.fn().mockReturnValue(null);
    }
    window.addEventListener(TABLE_COLUMN_CLICK_EVENT, onTableColumnClick);
  });

  afterEach(() => {
    window.removeEventListener(TABLE_COLUMN_CLICK_EVENT, onTableColumnClick);
    vi.restoreAllMocks();
    editor?.destroy();
  });

  function setupTableWithHandle() {
    editor = createEditor(`
      <table colwidth="[150, 250]">
        <tbody>
          <tr><td>A</td><td>B</td></tr>
          <tr><td>C</td><td>D</td></tr>
        </tbody>
      </table>
    `);

    const tableEl = editor.view.dom.querySelector('table');
    expect(tableEl).not.toBeNull();
    const cells = tableEl!.querySelectorAll('td');

    const handleEl = document.createElement('div');
    handleEl.className = 'column-resize-handle';
    cells[0].appendChild(handleEl);

    return { tableEl: tableEl!, cells, handleEl };
  }

  it('T002: 轻点（位移 < 5px 且耗时 < 400ms）稳定派发 TABLE_COLUMN_CLICK_EVENT', () => {
    const { handleEl } = setupTableWithHandle();

    // 触发 mousedown
    handleEl.dispatchEvent(
      new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
        clientX: 100,
        clientY: 200,
      })
    );

    // 模拟耗时 50ms，微小位移 (dx=1, dy=2)
    mockTime += 50;

    // 触发 mouseup
    document.dispatchEvent(
      new MouseEvent('mouseup', {
        bubbles: true,
        cancelable: true,
        clientX: 101,
        clientY: 202,
      })
    );

    expect(receivedEvents.length).toBe(1);
    const detail = receivedEvents[0].detail;
    expect(detail.tablePos).toBe(0);
    expect(detail.columnIndex).toBe(0);
    expect(detail.currentWidth).toBe(150);
    expect(detail.clientX).toBe(101);
    expect(detail.clientY).toBe(202);
  });

  it('T003: 核心断点探针 —— mousedown 后手柄 DOM 被替换脱离，仍能派发事件', () => {
    const { handleEl, cells } = setupTableWithHandle();

    // 触发 mousedown
    handleEl.dispatchEvent(
      new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
        clientX: 100,
        clientY: 200,
      })
    );

    // 关键模拟：prosemirror-tables 在拖拽/点击交互中重绘手柄，旧 handleEl 脱离文档
    handleEl.remove();
    expect(handleEl.isConnected).toBe(false);

    // DOM 中放入全新节点
    const newHandleEl = document.createElement('div');
    newHandleEl.className = 'column-resize-handle';
    cells[0].appendChild(newHandleEl);

    // 模拟耗时 60ms，微小位移
    mockTime += 60;

    // 触发 mouseup
    document.dispatchEvent(
      new MouseEvent('mouseup', {
        bubbles: true,
        cancelable: true,
        clientX: 102,
        clientY: 201,
      })
    );

    // 断言：前移解析后，即使旧 handleEl 脱离文档，mouseup 仍应成功派发事件
    expect(receivedEvents.length).toBe(1);
    const detail = receivedEvents[0].detail;
    expect(detail.tablePos).toBe(0);
    expect(detail.columnIndex).toBe(0);
    expect(detail.currentWidth).toBe(150);
    expect(detail.clientX).toBe(102);
    expect(detail.clientY).toBe(201);
  });

  it('T004: 拖拽（位移 >= 5px 或耗时 >= 400ms）不派发事件', () => {
    const { handleEl } = setupTableWithHandle();

    // 场景 A: 位移超限 (dx = 10px)
    handleEl.dispatchEvent(
      new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
        clientX: 100,
        clientY: 200,
      })
    );
    mockTime += 50;
    document.dispatchEvent(
      new MouseEvent('mouseup', {
        bubbles: true,
        cancelable: true,
        clientX: 110,
        clientY: 200,
      })
    );
    expect(receivedEvents.length).toBe(0);

    // 场景 B: 耗时超限 (dt = 500ms)
    handleEl.dispatchEvent(
      new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
        clientX: 100,
        clientY: 200,
      })
    );
    mockTime += 500;
    document.dispatchEvent(
      new MouseEvent('mouseup', {
        bubbles: true,
        cancelable: true,
        clientX: 101,
        clientY: 201,
      })
    );
    expect(receivedEvents.length).toBe(0);
  });

  it('T004: destroy() 后注销监听，无残留副作用', () => {
    const { handleEl } = setupTableWithHandle();

    editor.destroy();

    handleEl.dispatchEvent(
      new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
        clientX: 100,
        clientY: 200,
      })
    );
    mockTime += 50;
    document.dispatchEvent(
      new MouseEvent('mouseup', {
        bubbles: true,
        cancelable: true,
        clientX: 101,
        clientY: 201,
      })
    );

    expect(receivedEvents.length).toBe(0);
  });
});
