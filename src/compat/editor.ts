/**
 * /editor — 过渡别名入口（@deprecated）
 *
 * 原 `/editor` 入口已更名为 `/tiptap`：该入口实际内容仅包含 Tiptap 表格扩展，
 * 并非完整编辑器基座，命名与能力不符。本文件仅做 `export *` 转发，保证宿主
 * 现有导入路径（如 frontend-v2 的 ResizableTable 桥）零改动。
 *
 * 移除计划：1.0 删除本别名，宿主统一改为 '@tilo-ui/content-kit/tiptap'。
 */
export * from '../tiptap/index';
