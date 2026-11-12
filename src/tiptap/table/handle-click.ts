/**
 * tiptap/table/handle-click — 列边界手柄的点击识别（内部模块）
 *
 * 交互契约：用户在 column-resize-handle 上按下后几乎不位移地抬起（< 5px 且 < 400ms），
 * 判定为"点击"而非"拖拽"，通过 window 自定义事件通知宿主弹出列宽设置面板；
 * 拖拽行为仍由 prosemirror-tables 的 columnResizing 处理。
 */
import { Plugin, PluginKey } from 'prosemirror-state';
import { getCellColumnIndex } from './colwidth';

export const TABLE_COLUMN_CLICK_EVENT = 'tiptap:table-column-click';

export interface TableColumnClickDetail {
  tablePos: number;
  columnIndex: number;
  currentWidth: number | null;
  clientX: number;
  clientY: number;
}

/** 从 column-resize-handle 元素向上找到所属 table 节点位置及列索引。 */
export function resolveHandleTarget(view: any, handleEl: HTMLElement): TableColumnClickDetail | null {
  const tableEl = handleEl.closest('table');
  if (!tableEl) return null;

  // 列索引：column-resize-handle 是 td/th 的子元素，其父单元格在行中的位置即列索引
  const cellEl = handleEl.parentElement as HTMLElement;
  if (!cellEl || (cellEl.tagName !== 'TD' && cellEl.tagName !== 'TH')) return null;
  const columnIndex = getCellColumnIndex(cellEl);
  if (columnIndex < 0) return null;

  // 从 DOM 元素反查 ProseMirror 节点位置
  let tablePos = -1;
  try {
    // posAtDOM(tableEl, 0) 返回的是 table 节点内部偏移 0 的位置（即第一个 tableRow 起始处，通常偏移为 1）
    // 因此减 1 才能获得真正的 table 节点绝对位置
    const rawPos = view.posAtDOM(tableEl, 0);
    const candidatePos = rawPos - 1;
    if (candidatePos >= 0) {
      const candidateNode = view.state.doc.nodeAt(candidatePos);
      if (candidateNode && candidateNode.type.name === 'table') {
        tablePos = candidatePos;
      }
    }
    // 稳健兜底：若 candidatePos 未直接命中 table（例如嵌套结构），通过单元格位置用 $pos 向上查找祖先 table 节点
    if (tablePos < 0) {
      const cellInsidePos = view.posAtDOM(cellEl, 0);
      const $pos = view.state.doc.resolve(Math.max(0, cellInsidePos));
      for (let d = $pos.depth; d > 0; d--) {
        if ($pos.node(d).type.name === 'table') {
          tablePos = $pos.before(d);
          break;
        }
      }
    }
  } catch {
    return null;
  }
  if (tablePos < 0) return null;

  // 当前列宽：优先从 table 节点的 colwidth 属性读取
  let currentWidth: number | null = null;
  try {
    const tableNode = view.state.doc.nodeAt(tablePos);
    if (tableNode && tableNode.type.name === 'table') {
      const cw = tableNode.attrs.colwidth as (number | null)[] | null;
      if (Array.isArray(cw) && cw[columnIndex] != null) {
        currentWidth = cw[columnIndex];
      } else {
        // 降级：从单元格的 colwidth 属性读取
        const firstRow = tableNode.firstChild;
        if (firstRow && firstRow.type.name === 'tableRow') {
          let idx = 0;
          firstRow.forEach((cell: any) => {
            const colspan = typeof cell.attrs.colspan === 'number' ? cell.attrs.colspan : 1;
            if (idx === columnIndex && Array.isArray(cell.attrs.colwidth) && cell.attrs.colwidth[0]) {
              currentWidth = cell.attrs.colwidth[0];
            }
            idx += colspan;
          });
        }
      }
    }
  } catch {
    // 忽略：宽度读取失败不影响点击事件本身
  }

  return { tablePos, columnIndex, currentWidth, clientX: 0, clientY: 0 };
}

/**
 * 注入 handle 点击检测插件：监听 column-resize-handle 的 mousedown/mouseup，
 * 位移 < 5px 且时间 < 400ms 时判定为点击，阻止 columnResizing 拖拽并发射事件。
 *
 * 实现方式：使用 Plugin 的 view 生命周期，在 view.dom 上注册原生捕获阶段
 * mousedown 监听器，不依赖 ProseMirror 的 handleDOMEvents（可能被其他插件
 * 拦截或执行顺序不确定）。捕获阶段在冒泡之前，确保先于 columnResizing 执行。
 */
export function createHandleClickPlugin() {
  const CLICK_THRESHOLD_PX = 5;
  const CLICK_THRESHOLD_MS = 400;

  return new Plugin({
    key: new PluginKey('tableHandleClick'),
    view(editorView: any) {
      const dom: HTMLElement = editorView.dom;

      const onMouseDown = (event: MouseEvent) => {
        const target = event.target as HTMLElement;
        const isHandle = !!target && target.classList.contains('column-resize-handle');
        if (!isHandle) return;

        const startX = event.clientX;
        const startY = event.clientY;
        const startTime = Date.now();

        const onMouseUp = (upEvent: MouseEvent) => {
          document.removeEventListener('mouseup', onMouseUp, true);
          const dx = Math.abs(upEvent.clientX - startX);
          const dy = Math.abs(upEvent.clientY - startY);
          const dt = Date.now() - startTime;
          const isClick = dx < CLICK_THRESHOLD_PX && dy < CLICK_THRESHOLD_PX && dt < CLICK_THRESHOLD_MS;

          if (isClick) {
            const detail = resolveHandleTarget(editorView, target);
            if (detail) {
              detail.clientX = upEvent.clientX;
              detail.clientY = upEvent.clientY;
              upEvent.preventDefault();
              upEvent.stopPropagation();
              window.dispatchEvent(
                new CustomEvent(TABLE_COLUMN_CLICK_EVENT, { detail })
              );
            }
          }
        };
        // 捕获阶段监听 mouseup
        document.addEventListener('mouseup', onMouseUp, true);
      };

      // 捕获阶段监听 mousedown，先于 columnResizing 的 handleMouseDown
      dom.addEventListener('mousedown', onMouseDown, true);

      return {
        destroy() {
          dom.removeEventListener('mousedown', onMouseDown, true);
        },
      };
    },
  });
}
