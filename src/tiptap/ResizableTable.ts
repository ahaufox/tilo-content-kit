/**
 * ResizableTable — 可持久化列宽的 Tiptap Table 扩展
 *
 * 职责：扩展 @tiptap/extension-table，新增 colwidth 节点属性，将用户拖拽调整后的列宽
 * 持久化到 ProseMirror 文档模型，从而支持刷新保持、Yjs 协同同步以及后端 Word 导出。
 *
 * 上收说明：原实现位于宿主 documents/extensions，作为通用基座被两层编辑器共用，
 * 现上收至 SDK /tiptap（0.4.0 起为 /editor）。事务来源常量统一由
 * src/internal/origins 定义，与 /collab 共用同一份。
 *
 * 模块划分（0.7.0 起为满足单文件门禁拆分）：
 *   - ./table/colwidth.ts     DOM ↔ 文档模型的列宽解析与比较
 *   - ./table/handle-click.ts 列边界手柄点击识别与自定义事件
 *   - 本文件                   扩展定义、初始同步与 ProseMirror 插件装配
 *
 * 变更说明：
 *   - 新增 colwidth 属性，parseHTML/renderHTML 与 <colgroup>/<col> 双向映射
 *   - ResizableTableCell/Header 在解析阶段即从父 table 的 colwidth 属性读取自身列宽，
 *     避免初始加载时 TableView 无法渲染固定列宽
 *   - 注入 ProseMirror plugin，在 columnResizing 完成后将 DOM 列宽回写为 attrs
 *   - 列宽调整 transaction 使用 origin 'user-table-resize'，便于 UndoManager 隔离
 */
import { Table as BaseTable, TableCell, TableHeader } from '@tiptap/extension-table';
import { columnResizing } from 'prosemirror-tables';
import { Plugin, PluginKey } from 'prosemirror-state';
import { USER_TABLE_RESIZE_ORIGIN } from '../internal/origins';
import {
  colwidthEqual,
  expandTableColwidth,
  getTableColwidthFromCells,
  parseCellColwidth,
} from './table/colwidth';
import { createHandleClickPlugin } from './table/handle-click';

export { USER_TABLE_RESIZE_ORIGIN };
export {
  TABLE_COLUMN_CLICK_EVENT,
  resolveHandleTarget,
} from './table/handle-click';
export type { TableColumnClickDetail } from './table/handle-click';

export const ResizableTableCell = TableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      colwidth: {
        default: null,
        parseHTML: element => parseCellColwidth(element),
        renderHTML: attributes => {
          if (!attributes.colwidth?.length) return {};
          return { colwidth: attributes.colwidth.join(',') };
        },
      },
    };
  },
});

export const ResizableTableHeader = TableHeader.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      colwidth: {
        default: null,
        parseHTML: element => parseCellColwidth(element),
        renderHTML: attributes => {
          if (!attributes.colwidth?.length) return {};
          return { colwidth: attributes.colwidth.join(',') };
        },
      },
    };
  },
});

export const ResizableTable = BaseTable.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      colwidth: {
        default: null,
        parseHTML: element => {
          // 优先读取 table 自身的 colwidth 属性（renderHTML 写入的持久化值）
          const attrColwidth = element.getAttribute('colwidth');
          if (attrColwidth) {
            try {
              const parsed = JSON.parse(attrColwidth);
              if (Array.isArray(parsed)) return parsed;
            } catch {
              // 非 JSON 格式时降级到 colgroup 解析
            }
          }
          // 兼容旧文档/外部粘贴：从 <colgroup>/<col> 解析
          const colgroup = element.querySelector('colgroup');
          const cols = colgroup?.querySelectorAll('col');
          if (!cols?.length) return null;
          return Array.from(cols).map(col => {
            const match = col.style.width.match(/^(\d+(?:\.\d+)?)px$/);
            return match ? parseInt(match[1], 10) : null;
          });
        },
        renderHTML: attributes => {
          if (!attributes.colwidth?.length) return {};
          return { colwidth: JSON.stringify(attributes.colwidth) };
        },
      },
    };
  },

  /**
   * 初始加载补偿：
   * 从 HTML/Yjs 初始化文档时 ProseMirror 不会触发 appendTransaction，导致
   * table.attrs.colwidth 无法同步到第一行单元格。此处通过 onCreate 再分发一次
   * setNodeMarkup 事务完成同步（Tiptap 的 create 事件在 setTimeout 中触发，主要
   * 靠 ResizableTableCell/Header 的 parseHTML 在初始化阶段同步设置列宽）。
   */
  onCreate() {
    const { editor } = this;
    if (!editor || editor.isDestroyed) return;

    const cellUpdates: { pos: number; attrs: Record<string, unknown> }[] = [];

    editor.state.doc.descendants((node, pos) => {
      if (node.type.name !== 'table') return true;

      const fromCells = getTableColwidthFromCells(node as any);
      const fromTable = expandTableColwidth(node as any, node.attrs.colwidth ?? null);

      if (fromCells === null && fromTable !== null) {
        const firstRow = node.firstChild;
        if (firstRow && firstRow.type.name === 'tableRow') {
          let colIndex = 0;
          firstRow.forEach((cell, offset) => {
            const colspan = typeof cell.attrs.colspan === 'number' ? cell.attrs.colspan : 1;
            const cw = fromTable[colIndex] ?? null;
            if (cw !== null && cw > 0) {
              const cellPos = pos + 2 + offset;
              cellUpdates.push({
                pos: cellPos,
                attrs: { ...cell.attrs, colwidth: [cw] },
              });
            }
            colIndex += colspan;
          });
        }
      }

      return true;
    });

    if (cellUpdates.length === 0) return;

    let tr = editor.state.tr;
    cellUpdates.forEach(({ pos, attrs }) => {
      if (pos >= 0) {
        tr = tr.setNodeMarkup(pos, undefined, attrs);
      }
    });
    if (tr.docChanged) {
      editor.view.dispatch(tr);
    }
  },

  renderHTML({ node, HTMLAttributes }) {
    const colwidth: (number | null)[] | null = node.attrs.colwidth;
    let colgroup: any[] = [];
    if (colwidth?.length) {
      colgroup = ['colgroup', {}, ...colwidth.map(w =>
        ['col', { style: w ? `width: ${w}px;` : undefined }]
      )];
    }
    const table = this.parent?.({ node, HTMLAttributes });
    if (table && Array.isArray(table)) {
      // 父类 renderHTML 已在索引 2 处返回一个 colgroup；若本扩展解析到 colwidth，
      // 则用自定义 colgroup 替换它，避免输出两个 colgroup 导致 Word 导出/渲染异常。
      if (colgroup.length) {
        (table as any[]).splice(2, 1, colgroup);
      }
    }
    return table as any;
  },

  addProseMirrorPlugins() {
    // 关键修复：父类 addProseMirrorPlugins 在扩展初始化时仅执行一次，
    // 其中 `const isResizable = this.options.resizable && this.editor.isEditable`
    // 会导致首渲染为只读态（editable=false）时 columnResizing 插件被完全跳过；
    // 后续 setEditable(true) 不会重新调用 addProseMirrorPlugins，故 handle 永不出现。
    //
    // 修复策略：始终注入 columnResizing，只读态由 CSS
    // `.ProseMirror[contenteditable="false"] .column-resize-handle { display: none; }` 隐藏。
    const parentPlugins = this.parent?.() || [];

    // 显式注入 columnResizing（无论当前 isEditable 状态）
    const resizePlugin = columnResizing({
      handleWidth: this.options.handleWidth,
      cellMinWidth: this.options.cellMinWidth,
      defaultCellMinWidth: this.options.cellMinWidth,
      View: this.options.View as any,
      lastColumnResizable: this.options.lastColumnResizable,
    });

    // 去重：若父类已注入 columnResizing（初始化时即为可编辑态），避免重复。
    // 注意：ProseMirror Plugin 运行时有 key 属性，但类型定义未暴露，需 as any 访问。
    const resizePluginKey = (resizePlugin as any).key;
    const hasResizePlugin = parentPlugins.some(
      (p) => (p as any).key === resizePluginKey,
    );
    const mergedPlugins = hasResizePlugin
      ? parentPlugins
      : [resizePlugin, ...parentPlugins];

    const syncColwidthPlugin = new Plugin({
      key: new PluginKey('syncColwidth'),
      appendTransaction: (transactions, _oldState, newState) => {
        // 识别由本 plugin 自身触发的回写 transaction，避免循环同步。
        if (transactions.some(tr => tr.getMeta('stopSyncColwidth') === true)) {
          return null;
        }

        const tableUpdates: { pos: number; colwidth: (number | null)[] }[] = [];
        const cellUpdates: { pos: number; attrs: Record<string, unknown> }[] = [];

        newState.doc.descendants((node, pos) => {
          if (node.type.name !== 'table') return true;

          const fromCells = getTableColwidthFromCells(node as any);
          const fromTableRaw: (number | null)[] | null = node.attrs.colwidth ?? null;
          const fromTable = expandTableColwidth(node as any, fromTableRaw);

          // 场景 A：单元格已存在列宽（用户正在拖拽或已完成拖拽），优先回写到 table 节点持久化。
          if (fromCells !== null && !colwidthEqual(fromCells, fromTable)) {
            tableUpdates.push({ pos, colwidth: fromCells });
            return true;
          }

          // 场景 B：单元格无列宽但 table 节点保存了历史列宽（文档初始化/刷新后），
          // 需要把 table 的列宽分发到第一行单元格，TableView 才能正确渲染固定列宽。
          if (fromCells === null && fromTable !== null) {
            const firstRow = node.firstChild;
            if (firstRow && firstRow.type.name === 'tableRow') {
              let colIndex = 0;
              firstRow.forEach((cell, offset) => {
                const colspan = typeof cell.attrs.colspan === 'number' ? cell.attrs.colspan : 1;
                const cw = fromTable[colIndex] ?? null;
                if (cw !== null && cw > 0) {
                  // pos 是 table openStart 之前：+1(table openStart) +1(row openStart) + offset
                  const cellPos = pos + 2 + offset;
                  cellUpdates.push({
                    pos: cellPos,
                    attrs: { ...cell.attrs, colwidth: [cw] },
                  });
                }
                colIndex += colspan;
              });
            }
          }

          return true;
        });

        if (tableUpdates.length === 0 && cellUpdates.length === 0) return null;

        let tr = newState.tr;
        tableUpdates.forEach(({ pos, colwidth }) => {
          tr = tr.setNodeAttribute(pos, 'colwidth', colwidth);
        });
        cellUpdates.forEach(({ pos, attrs }) => {
          if (pos >= 0) {
            tr = tr.setNodeMarkup(pos, undefined, attrs);
          }
        });
        tr.setMeta('stopSyncColwidth', true);
        tr.setMeta('origin', USER_TABLE_RESIZE_ORIGIN);
        return tr;
      },
    });
    return [...mergedPlugins, syncColwidthPlugin, createHandleClickPlugin()];
  },
});
