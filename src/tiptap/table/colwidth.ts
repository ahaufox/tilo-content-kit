/**
 * tiptap/table/colwidth — 列宽在 DOM 与 ProseMirror 文档模型之间的映射（内部模块）
 *
 * 宽度事实源：table.attrs.colwidth（整表数组）与 cell.attrs.colwidth（单列数组）。
 * 本模块只做解析/比较/展开，不含任何编辑器生命周期逻辑，便于单测与复用。
 */
import { Node as PMNode } from 'prosemirror-model';

/** 比较两组列宽是否语义相等（长度不同也视为不等）。 */
export function colwidthEqual(
  a: (number | null)[] | null,
  b: (number | null)[] | null,
): boolean {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    if ((a[i] ?? null) !== (b[i] ?? null)) return false;
  }
  return true;
}

/** 从 table 节点第一行的单元格读取 columnResizing 写入的 colwidth。 */
export function getTableColwidthFromCells(tableNode: PMNode): (number | null)[] | null {
  const firstRow = tableNode.firstChild;
  if (!firstRow || firstRow.type.name !== 'tableRow') return null;

  const colwidths: (number | null)[] = [];
  let hasAny = false;

  firstRow.forEach((cell) => {
    const cw = cell.attrs.colwidth;
    if (Array.isArray(cw) && cw.length > 0 && typeof cw[0] === 'number' && cw[0] > 0) {
      colwidths.push(cw[0]);
      hasAny = true;
    } else {
      colwidths.push(null);
    }
  });

  return hasAny ? colwidths : null;
}

/** 把 table.attrs.colwidth 展开成与第一行单元格数量对齐的数组。 */
export function expandTableColwidth(
  tableNode: PMNode,
  tableColwidth: (number | null)[] | null,
): (number | null)[] | null {
  if (!tableColwidth?.length) return null;
  const firstRow = tableNode.firstChild;
  if (!firstRow || firstRow.type.name !== 'tableRow') return null;

  const result: (number | null)[] = [];
  firstRow.forEach((cell) => {
    const colspan = typeof cell.attrs.colspan === 'number' ? cell.attrs.colspan : 1;
    for (let i = 0; i < colspan; i += 1) {
      result.push(tableColwidth[result.length] ?? null);
    }
  });
  return result;
}

/** 从父 table 的 colwidth 属性解析整表列宽数组。 */
export function parseTableColwidthAttr(element: HTMLElement): (number | null)[] | null {
  const table = element.closest('table');
  if (!table) return null;
  const attrColwidth = table.getAttribute('colwidth');
  if (!attrColwidth) return null;
  try {
    const parsed = JSON.parse(attrColwidth);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // 非 JSON 时按逗号分割兼容
    return attrColwidth.split(',').map((w) => {
      const n = parseInt(w.trim(), 10);
      return Number.isNaN(n) ? null : n;
    });
  }
  return null;
}

/** 计算单元格在所在行中的列索引（考虑 colspan）。 */
export function getCellColumnIndex(element: HTMLElement): number {
  const row = element.parentElement;
  if (!row) return -1;
  const children = Array.from(row.children);
  let index = 0;
  for (const child of children) {
    if (child === element) return index;
    const colspan = parseInt(child.getAttribute('colspan') || '1', 10);
    index += colspan;
  }
  return -1;
}

/** 从父 table 属性或 colgroup 解析当前单元格的 colwidth。 */
export function parseCellColwidth(element: HTMLElement): number[] | null {
  // 自身显式 colwidth 属性优先级最高
  const ownColwidth = element.getAttribute('colwidth');
  if (ownColwidth) {
    const parsed = ownColwidth.split(',').map((w) => parseInt(w.trim(), 10));
    if (parsed.length > 0 && !Number.isNaN(parsed[0])) return parsed;
  }

  const table = element.closest('table');
  if (!table) return null;

  // 优先读取父 table 的 colwidth 属性
  const tableColwidth = parseTableColwidthAttr(element);
  if (tableColwidth) {
    const colIndex = getCellColumnIndex(element);
    if (colIndex >= 0 && tableColwidth[colIndex] != null) {
      return [tableColwidth[colIndex]];
    }
  }

  // 兼容旧文档/外部粘贴：从 <colgroup>/<col> 解析
  const cols = table.querySelectorAll('colgroup > col');
  const cellIndex = Array.from(table.querySelectorAll('tr:first-child > th, tr:first-child > td')).indexOf(element);
  if (cellIndex > -1 && cols[cellIndex]) {
    const colEl = cols[cellIndex] as HTMLElement;
    const width = colEl.getAttribute('width') || colEl.style.width;
    const match = width?.match(/^(\d+(?:\.\d+)?)px$/);
    if (match) return [parseInt(match[1], 10)];
  }

  return null;
}
