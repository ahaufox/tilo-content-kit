/**
 * internal/origins — 事务来源标识唯一定义处（不对外暴露独立入口）
 *
 * 这些常量同时被 /tiptap（ResizableTable 回写列宽）与 /collab（UndoManager 隔离）
 * 使用，二者必须严格相等，否则撤销隔离会静默失效。因此只允许在此定义，
 * 由各入口 re-export，禁止在入口实现文件内重复书写字面量。
 *
 * 依赖方向约束：internal 层不得 import 任何入口实现。
 */

/** 标记 AI 代理编辑的事务来源标识 */
export const AGENT_ORIGIN = 'agent';

/** 标记用户手动调整表格列宽的事务来源标识 */
export const USER_TABLE_RESIZE_ORIGIN = 'user-table-resize';

/** 标记 patchYjsOriginSync 已修补的 Symbol 幂等键 */
export const PATCHED_SYMBOL = Symbol.for('yjs.origin.sync.patched');
