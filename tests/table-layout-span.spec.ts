import { describe, expect, it } from 'vitest';

import { injectTableWidthsToHtml } from '../src/content/table-layout';

function readColwidth(html: string): number[] {
  const match = html.match(/<table[^>]*colwidth='(\[[^\]]*\])'/i);
  expect(match).not.toBeNull();
  return JSON.parse(match![1]);
}

describe('injectTableWidthsToHtml 合并单元格列宽', () => {
  const mergedTable = `
    <table>
      <thead>
        <tr><th colspan="2">合并表头</th><th>第三列</th></tr>
      </thead>
      <tbody>
        <tr><td rowspan="2">纵向合并</td><td>B</td><td>C</td></tr>
        <tr><td>D</td><td>E</td></tr>
      </tbody>
    </table>`;

  it('按逻辑列数生成 colwidth 与 colgroup', () => {
    const output = injectTableWidthsToHtml(mergedTable, 600);
    const widths = readColwidth(output);

    expect(widths).toHaveLength(3);
    expect(output.match(/<col\b/g)).toHaveLength(3);
  });

  it('colspan 单元格写入多列宽度，rowspan 后续行不重复占列', () => {
    const output = injectTableWidthsToHtml(mergedTable, 600);
    const widths = readColwidth(output);
    const container = document.createElement('div');
    container.innerHTML = output;
    const rows = container.querySelectorAll('tr');

    const header = rows[0].querySelectorAll('th, td')[0] as HTMLElement;
    expect(header.getAttribute('colwidth')).toBe(`${widths[0]},${widths[1]}`);

    const secondRow = rows[1].querySelectorAll('td');
    expect(secondRow[0].getAttribute('colwidth')).toBe(String(widths[0]));
    expect(secondRow[1].getAttribute('colwidth')).toBe(String(widths[1]));

    const thirdRow = rows[2].querySelectorAll('td');
    expect(thirdRow[0].getAttribute('colwidth')).toBe(String(widths[1]));
    expect(thirdRow[1].getAttribute('colwidth')).toBe(String(widths[2]));
  });

  it('已有 colwidth 的表格保持原样', () => {
    const original = '<table colwidth="[100,200]"><tr><td>A</td><td>B</td></tr></table>';
    expect(injectTableWidthsToHtml(original)).toBe(original);
  });
});
