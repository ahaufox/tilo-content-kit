import { Schema } from 'prosemirror-model';
import { describe, expect, it } from 'vitest';

import {
  expandTableColwidth,
  getCellColumnIndex,
  getTableColwidthFromCells,
  parseCellColwidth,
  sliceColwidthForSpan,
} from '../src/tiptap/table/colwidth';

const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: { content: 'text*', group: 'block' },
    text: { group: 'inline' },
    table: {
      content: 'tableRow+',
      group: 'block',
      attrs: { colwidth: { default: null } },
    },
    tableRow: { content: '(tableCell|tableHeader)+' },
    tableCell: {
      content: 'paragraph+',
      attrs: {
        colspan: { default: 1 },
        rowspan: { default: 1 },
        colwidth: { default: null },
      },
    },
    tableHeader: {
      content: 'paragraph+',
      attrs: {
        colspan: { default: 1 },
        rowspan: { default: 1 },
        colwidth: { default: null },
      },
    },
  },
});

function cell(attrs: Record<string, unknown>) {
  return schema.node('tableCell', attrs, [schema.node('paragraph')]);
}

describe('colwidth 跨列占格', () => {
  it('getTableColwidthFromCells 按 colspan 展开为逻辑列', () => {
    const table = schema.node('table', { colwidth: null }, [
      schema.node('tableRow', null, [
        cell({ colspan: 2, colwidth: [120, 200] }),
        cell({ colspan: 1, colwidth: [80] }),
      ]),
    ]);

    expect(getTableColwidthFromCells(table)).toEqual([120, 200, 80]);
  });

  it('expandTableColwidth 与首行 colspan 对齐', () => {
    const table = schema.node('table', { colwidth: [120, 200, 80] }, [
      schema.node('tableRow', null, [
        cell({ colspan: 2, colwidth: null }),
        cell({ colspan: 1, colwidth: null }),
      ]),
    ]);

    expect(expandTableColwidth(table, [120, 200, 80])).toEqual([120, 200, 80]);
  });

  it('sliceColwidthForSpan 返回跨列区间并过滤空值', () => {
    expect(sliceColwidthForSpan([120, 200, 80], 0, 2)).toEqual([120, 200]);
    expect(sliceColwidthForSpan([120, 200, 80], 1, 2)).toEqual([200, 80]);
    expect(sliceColwidthForSpan([120, null, 80], 0, 2)).toEqual([120]);
    expect(sliceColwidthForSpan([null, null], 0, 2)).toBeNull();
  });

  it('DOM 解析时 rowspan 占位会顺移后续行列索引', () => {
    document.body.innerHTML = `
      <table colwidth="[100,110,120]">
        <tbody>
          <tr><td rowspan="2">A</td><td>B</td><td>C</td></tr>
          <tr><td colspan="2">D</td></tr>
        </tbody>
      </table>`;
    const secondRowCell = document.querySelector(
      'tr:nth-child(2) td',
    ) as HTMLElement;

    expect(getCellColumnIndex(secondRowCell)).toBe(1);
    expect(parseCellColwidth(secondRowCell)).toEqual([110, 120]);
  });
});
