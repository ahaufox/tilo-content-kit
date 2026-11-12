/**
 * ResizableTable — colwidth 属性解析与渲染单元测试
 *
 * 职责：验证 ResizableTable 扩展能正确从 <colgroup>/<col> 解析 colwidth，
 * 并能根据 colwidth 渲染出对应 HTML；同时保证旧文档（无 colwidth）兼容。
 */

import { describe, it, expect } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { TableRow } from '@tiptap/extension-table-row';
import { ResizableTable, ResizableTableCell, ResizableTableHeader, resolveHandleTarget } from '../src/tiptap';

function createEditor(html: string) {
  return new Editor({
    extensions: [
      StarterKit.configure({
        // Tiptap v3 中 history 已更名为 undoRedo
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

describe('ResizableTable colwidth', () => {
  it('parseHTML: 从 <col style="width: 120px"> 解析出 colwidth', () => {
    const html = `
      <table>
        <colgroup><col style="width: 120px;"><col style="width: 240px;"></colgroup>
        <tbody>
          <tr><td>A</td><td>B</td></tr>
        </tbody>
      </table>
    `;
    const editor = createEditor(html);
    const json = editor.getJSON();
    const table = json.content?.find((n: any) => n.type === 'table');
    expect(table).toBeDefined();
    expect(table!.attrs?.colwidth).toEqual([120, 240]);
  });

  it('renderHTML: 从 colwidth [120, 240] 渲染出 <colgroup>', () => {
    const editor = createEditor('');
    editor.commands.setContent({
      type: 'doc',
      content: [
        {
          type: 'table',
          attrs: { colwidth: [120, 240] },
          content: [
            {
              type: 'tableRow',
              content: [
                { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'A' }] }] },
                { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'B' }] }] },
              ],
            },
          ],
        },
      ],
    });
    const html = editor.getHTML();
    expect(html).toContain('<colgroup>');
    expect(html).toContain('width: 120px');
    expect(html).toContain('width: 240px');
  });

  it('旧文档无 colwidth 时渲染不报错', () => {
    const html = `
      <table>
        <tbody>
          <tr><td>A</td><td>B</td></tr>
        </tbody>
      </table>
    `;
    const editor = createEditor(html);
    const json = editor.getJSON();
    const table = json.content?.find((n: any) => n.type === 'table');
    expect(table).toBeDefined();
    expect(table!.attrs?.colwidth).toBeNull();

    const outputHtml = editor.getHTML();
    expect(outputHtml).toContain('<table');
    expect(outputHtml).toContain('>A</p>');
    expect(outputHtml).toContain('>B</p>');
  });

  it('resize simulation: cell colwidth 变化后同步到 table.attrs.colwidth', () => {
    const editor = createEditor(`
      <table>
        <tbody>
          <tr><td>A</td><td>B</td><td>C</td></tr>
        </tbody>
      </table>
    `);

    let tablePos = -1;
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === 'table' && tablePos === -1) {
        tablePos = pos;
      }
    });
    expect(tablePos).toBeGreaterThan(-1);

    const table = editor.state.doc.nodeAt(tablePos)!;
    const firstRow = table.firstChild!;
    const firstCell = firstRow.firstChild!;
    const cellStart = tablePos + 2; // table(1) + row(1)

    // 模拟 columnResizing 完成：将第一个单元格的 colwidth 设为 [150]
    const tr = editor.state.tr.setNodeMarkup(cellStart, null, {
      ...firstCell.attrs,
      colwidth: [150],
    });
    editor.view.dispatch(tr);

    const json = editor.getJSON();
    const updatedTable = json.content?.find((n: any) => n.type === 'table');
    expect(updatedTable).toBeDefined();
    expect(updatedTable!.attrs?.colwidth).toEqual([150, null, null]);
  });

  it('load existing: table.attrs.colwidth 存在时反向同步到第一行单元格', () => {
    const editor = createEditor(`
      <table colwidth="[120,240]">
        <tbody>
          <tr><td>A</td><td>B</td></tr>
        </tbody>
      </table>
    `);

    // 直接检查 ProseMirror state（绕过 getJSON 缓存）
    const cellAttrs: any[] = [];
    editor.state.doc.descendants((node) => {
      if (node.type.name === 'tableCell' || node.type.name === 'tableHeader') {
        cellAttrs.push(node.attrs);
      }
    });
    expect(cellAttrs.map((attrs) => attrs.colwidth)).toEqual([[120], [240]]);

    const json = editor.getJSON();
    const table = json.content?.find((n: any) => n.type === 'table');
    expect(table).toBeDefined();
    expect(table!.attrs?.colwidth).toEqual([120, 240]);

    const row = table!.content?.[0] as any;
    expect(row).toBeDefined();
    const cells = row!.content as any[];
    expect(cells?.[0]?.attrs?.colwidth).toEqual([120]);
    expect(cells?.[1]?.attrs?.colwidth).toEqual([240]);
  });

  it('resolveHandleTarget: 正确定位 table 节点 (tablePos = 0) 及列索引与列宽', () => {
    const editor = createEditor(`
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
    expect(cells.length).toBe(4);

    // 仿真插入 handleEl 到第一个单元格（第 0 列）
    const handleEl = document.createElement('div');
    handleEl.className = 'column-resize-handle';
    cells[0].appendChild(handleEl);

    const detail = resolveHandleTarget(editor.view, handleEl);
    expect(detail).not.toBeNull();
    // 关键断言：tablePos 必须严格指向 table 节点（0），而不是被 tableRow 偏移为 1
    expect(detail!.tablePos).toBe(0);
    expect(editor.state.doc.nodeAt(detail!.tablePos)?.type.name).toBe('table');
    expect(detail!.columnIndex).toBe(0);
    expect(detail!.currentWidth).toBe(150);

    // 仿真测试第 1 列
    const handleEl2 = document.createElement('div');
    handleEl2.className = 'column-resize-handle';
    cells[1].appendChild(handleEl2);

    const detail2 = resolveHandleTarget(editor.view, handleEl2);
    expect(detail2).not.toBeNull();
    expect(detail2!.tablePos).toBe(0);
    expect(editor.state.doc.nodeAt(detail2!.tablePos)?.type.name).toBe('table');
    expect(detail2!.columnIndex).toBe(1);
    expect(detail2!.currentWidth).toBe(250);
  });
});
