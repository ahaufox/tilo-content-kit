---
inclusion: fileMatch
fileMatchPattern: ['src/**/*.ts', 'src/**/*.tsx', 'tests/**/*.ts', 'tests/**/*.tsx']
---

# 代码约定

## 通用规则

- **注释与提交信息使用中文**，提交格式遵循 Conventional Commits（如 `feat: 新增 X`、`fix: 修复 Y`）。
- 文风客观平铺，避免绝对化表述。
- **严禁**在未实际运行验证的情况下声称「测试通过」；所有结论须附带真实命令输出或日志凭据。

## TypeScript 规范

- **公共 API**：各入口公共类型和函数统一在 `src/<入口>/index.ts` 中导出，`package.json` 的 `exports` 字段同步声明。
- **内部实现**：跨入口共享逻辑放入 `src/internal/`，不通过 `exports` 对外暴露，避免循环依赖。
- **可空与边界处理**：显式处理 `null`/`undefined` 及边界输入，不为追求覆盖率编写脆弱的边界单测。
- **API 报告**：新增或变更公共 API 后，必须同步更新 `api/<入口>.api.md`，并通过 `pnpm api:check` 零差异校验。

## 测试规范

- **以核心路径为重**：用少量端到端脚本覆盖渲染、转换、协同等主路径，不追求组件级单测全覆盖。
- **网络隔离**：测试不得访问真实外网，所有外部依赖（HTTP、第三方服务）以 mock 隔离。
- 测试框架：`vitest` + `jsdom`；组件测试使用 `@testing-library/react`。

## 依赖约束

- 运行时依赖保持极简（当前仅 `marked`、`turndown`）。
- `react`、`tiptap`、`yjs` 等重型能力一律为可选 `peerDependencies`，核心入口不强制依赖。
- 新增依赖须使用精确版本（`--save-exact`），并确认包的活跃维护状态。
