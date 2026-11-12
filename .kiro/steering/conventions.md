---
inclusion: automatic
globs: ["src/**/*.ts", "src/**/*.tsx", "tests/**/*.ts", "tests/**/*.tsx"]
---

# 代码约定

> **Scope (Globs)**: `["src/**/*.ts", "src/**/*.tsx", "tests/**/*.ts", "tests/**/*.tsx"]`

## 通用

- 强制中文注释与中文提交信息（Conventional Commits）。
- 客观平铺文风，避免绝对化誓言式修辞。
- 严禁未真实运行验证即宣称「测试通过」；所有结论须附带命令输出或日志凭据。

## TypeScript

- 公共类型统一在入口 `index.ts` 集中再导出，内部实现置于 `internal/`，不在 `exports` 暴露。
- 跨入口共享逻辑放入 `internal/`，避免循环依赖。
- 可空与边界输入显式处理，不为覆盖率编写脆弱的边界单测。

## 测试

- 抓大放小：以少量端到端脚本跑通核心渲染 / 转换 / 协同主路径，不追求组件级单测全覆盖。
- 测试不得打真实外网；外部依赖以 mock 隔离。
