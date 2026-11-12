---
inclusion: always
---

# Tilo Content Kit — 产品概述

> **Scope (Globs)**: `["*"]`

`@tilo-ui/content-kit` 是 Tilo 法律工作空间的内容渲染与编辑 SDK，提供：

- **Markdown 静态 / 增量渲染**：基于 `marked` + `react-markdown` + `remark-gfm` 的内容管线。
- **内容转换**：HTML ↔ Markdown 双向转换（基于 `turndown`）。
- **Tiptap 扩展**：可选 `tiptap` 入口，提供富文本编辑器扩展能力（peer 依赖，按需引入）。
- **Yjs 协同**：可选 `collab` 入口，提供 Yjs 协同编辑基座（peer 依赖，按需引入）。
- **法律专用能力**：`legal` 入口沉淀法律文档结构解析与规范化工具。
- **主题与样式**：`theme` / `styles.css` 提供统一视觉与排版底座。

## 设计原则

- **入口彼此独立**：`content` / `convert` / `legal` / `theme` / `markdown` / `tiptap` / `editor` / `collab` 各入口解耦，消费方按需引入，避免把未使用能力拖入构建产物。
- **零运行时强制依赖**：`tiptap`、`yjs`、`react` 等均为 `peerDependencies`（optional），核心入口不强制要求宿主提供。
- **公共 API 契约锁定**：各入口公共 API 以 `api/<入口>.api.md` 机器快照为准，变更须同步更新（见 `scripts/api-report.mjs`）。

## 仓库定位

本仓库为独立开源子仓，根目录包含 `.kiro/`（Kiro 工作区配置）。构建、测试、发布流程以 `package.json` scripts 与 `scripts/` 下脚本为唯一事实来源；凭据（如 CNB 发布令牌）通过环境变量注入，绝不入库。
