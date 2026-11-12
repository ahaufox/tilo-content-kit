---
inclusion: always
---

# 技术栈与架构约束

> **Scope (Globs)**: `["src/**", "scripts/**", "*.config.ts", "tsup.config.ts", "vitest.config.ts"]`

## 栈

- **语言**：TypeScript（strict），Node >= 22。
- **构建**：`tsup`（ESM + CJS 双产物，`*.cjs` 兼容）。
- **测试**：`vitest` + `jsdom`，组件测试用 `@testing-library/react`。
- **包管理**：pnpm（>= 10），workspace 见 `pnpm-workspace.yaml`。

## 架构约束

- **入口导出契约**：所有公共入口集中在 `package.json` 的 `exports` 字段声明，`src/<入口>/index.ts` 为各入口根。新增公共 API 必须同步登记 `exports` 与 `api/<入口>.api.md`。
- **依赖边界**：运行时依赖保持极简（`marked`、`turndown`）；重型能力（Tiptap / Yjs / React）一律下沉为可选 peer 依赖。
- **样式隔离**：全局样式通过 `styles.css` 显式引入，组件层禁止隐式全局副作用（除非 `sideEffects` 声明）。
- **API 报告门禁**：`pnpm api:check` 比对公共 API 漂移，CI 与发布前必须为零差异。
