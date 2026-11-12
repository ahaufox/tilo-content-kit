# API 快照：@tilo-ui/content-kit/tiptap

> 自动生成，请勿手改。刷新：`pnpm api:update`。校验：`pnpm api:check`。

<!-- 类型摘要 sha256:5f8375e7a8f63acc -->

## 运行时导出符号

- `CONTENT_KIT_VERSION`
- `ResizableTable`
- `ResizableTableCell`
- `ResizableTableHeader`
- `TABLE_COLUMN_CLICK_EVENT`
- `USER_TABLE_RESIZE_ORIGIN`
- `resolveHandleTarget`

## 类型声明（归一化，含本地共享 chunk）

```ts
export { C as CONTENT_KIT_VERSION } from './version.js';
export { U as USER_TABLE_RESIZE_ORIGIN } from './origins.js';
import * as _tiptap_core from '@tiptap/core';
import * as _tiptap_extension_table from '@tiptap/extension-table';

/**
 * tiptap/table/handle-click — 列边界手柄的点击识别（内部模块）
 *
 * 交互契约：用户在 column-resize-handle 上按下后几乎不位移地抬起（< 5px 且 < 400ms），
 * 判定为"点击"而非"拖拽"，通过 window 自定义事件通知宿主弹出列宽设置面板；
 * 拖拽行为仍由 prosemirror-tables 的 columnResizing 处理。
 */

declare const TABLE_COLUMN_CLICK_EVENT = "tiptap:table-column-click";
interface TableColumnClickDetail {
    tablePos: number;
    columnIndex: number;
    currentWidth: number | null;
    clientX: number;
    clientY: number;
}
/** 从 column-resize-handle 元素向上找到所属 table 节点位置及列索引。 */
declare function resolveHandleTarget(view: any, handleEl: HTMLElement): TableColumnClickDetail | null;

declare const ResizableTableCell: _tiptap_core.Node<_tiptap_extension_table.TableCellOptions, any>;
declare const ResizableTableHeader: _tiptap_core.Node<_tiptap_extension_table.TableHeaderOptions, any>;
declare const ResizableTable: _tiptap_core.Node<_tiptap_extension_table.TableOptions, any>;

export { ResizableTable, ResizableTableCell, ResizableTableHeader, TABLE_COLUMN_CLICK_EVENT, type TableColumnClickDetail, resolveHandleTarget };
```
