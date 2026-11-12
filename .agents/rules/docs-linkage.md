---
trigger: model_decision
description: 多仓文档体系分层归属、模式 A 主子同构待办流转、取号防撞与代码变更触发文档更新规范。
globs: "docs/**/*, */docs/**/*, AGENTS.md, */AGENTS.md, contracts/**/*"
---

# 多仓文档分层与研发协同联动规范 (Docs Linkage)

> **Scope (Globs)**: `["docs/**/*", "*/docs/**/*", "AGENTS.md", "*/AGENTS.md", "contracts/**/*"]`

本规范定义 `law_tech` 主仓与 5 个 Git Submodule 子仓（`tilo-backend-app`、`tilo-core-engine`、`frontend-v2`、`admin-frontend`、`prod-dev-ops`）在微服务架构拆分下的文档归属边界、模式 A 待办生命周期与代码变更联动要求。

---

## 1. 文档落位三问判定法

新建或迁移任何研发文档前，按顺序回答以下三个问题以确定物理存储路径：

1. **是否仅约束单一子仓内部实现？**
   - **是**：落入对应子仓 `<subrepo>/docs/{00-待办,adr,architecture,operations}/`，不放入主仓 `docs/`。
   - **否**：进入第 2 问。
2. **是否属于跨 ≥2 个仓库的服务接口、兼容基线、拓扑或联调协议？**
   - **是**：REST/Schema 结构以提供方子仓 `contracts/openapi-*.json` 为唯一事实来源；版本配套、演进台账、服务拓扑与跨仓 ADR 落入主仓 `docs/08-跨仓协同/`；消费方所需的只读参考副本由工具投影至 `<subrepo>/docs/contracts-ref/`。
   - **否**：进入第 3 问。
3. **是否属于全业务线共享的产品战略、PRD、法律领域研究、品牌设计或全栈通用工程准则？**
   - **是**：落入主仓 `docs/{01-版本记录,02-规划,03-技术/08-规范与契约,04-研究,05-知识资产,06-设计,07-市场}/` 或 `.agents/rules/`。

> **开放协作仓安全红线**：`tilo-backend-app`、`frontend-v2`、`admin-frontend` 为面向外部协作的开放子仓（`is_external_collab = true`），其文档与规则目录中不得写入真实 API Key、RFC1918 内网私有 IP、硬编码 `X-Internal-Token` 密钥、私有 Prompt 配方正文或内部记忆文件（`memory-*.md`）。

---

## 2. 主子同构待办（模式 A）与“取号即占位”纪律

### 2.1 待办物理路由与命名隔离

- **跨仓协同专案（涉及 ≥2 个仓代码联动）**：立项于主仓 `docs/00-7待办/04-混合/<NNN-中文主题>/`；闭环后整体 `git mv` 至 `docs/00-7待办/已完成/<NNN-中文主题>/`。主仓禁止创建 `docs/00-待办/`。
- **单仓自治专案（仅单一子仓内闭环）**：立项于 `<subrepo>/docs/00-待办/<NNN-中文主题>/`；随本仓代码合并同步 `git mv` 至 `<subrepo>/docs/00-待办/已完成/<NNN-中文主题>/`。各子仓禁止创建 `docs/00-7待办/`。
- **历史归档保护**：已完成目录下的原始方案与脚手架保留复盘底稿，不做物理删除；主仓 `docs/00-7待办/已完成/` 与 `已实现PRD/` 下的存量历史文档保持原位与原文零改动。

### 2.2 全局三位递增编号与并发防撞

1. **共享编号池**：主仓与 5 个子仓共享三位零填充递增序列 `NNN`（如 `146`、`147`）；`>= 500` 段位专供外部 Issue / 工单直接映射特例，不参与常规递增最大值计算。
2. **取号即占位**：通过 `.specify/scripts/bash/create-new-feature.sh [--repo <subrepo>] "<主题>"` 取号后，脚本立即在目标仓库创建 `<NNN-主题>/spec.md` 占位；倡议立项后先行提交目录占位或随首个 Commit 推送。若多端并发立项发生编号碰撞，后提交方递增 `+1` 重新取号。
3. **单仓独立克隆场景**：协作者在未挂载主仓的单子仓克隆环境立项时，需先核实最新全局编号并通过 `--number <NNN>` 显式传入。

---

## 3. 代码变更触发文档更新规则表

| 代码 / 工程变更动作 | 同步更新的文档或制品 | 门禁校验机制 |
| :--- | :--- | :--- |
| 新增/修改/废弃对外 HTTP 路由或请求响应 Schema | 重新导出子仓 `contracts/openapi-*.json`，更新 `@tilo/api-client` / `tilo-core-sdk`，并在 `docs/08-跨仓协同/interface-changelog.md` 追加记录 | `check_contract_compat.sh`、`release_gate_audit.sh` |
| 修改 `global_ctx` 字段或公共 SSE 事件协议 | 更新主仓 `global_ctx` 规范或 `tilo-core-engine/contracts/sse-events.md`，执行 `infra-rules-skills-sync/execute.py --sync-subrepos` 刷新 `contracts-ref/` | `docs_lint.py --check-projections` |
| 新增微服务、变更标准端口、调整环境变量或网关转发 | 更新 `docs/08-跨仓协同/service-topology.md` 及关联子仓 `docs/operations/` | PR 检查清单、`docs_lint.py` |
| 子仓内部新增核心模块分层或重大单仓技术选型 | 更新 `<subrepo>/docs/architecture/` 或新增 `<subrepo>/docs/adr/`，按需校准 `<subrepo>/AGENTS.md` | PR 检查清单、`docs_lint.py` |
| 完成单仓或跨仓待办专案开发验收 | 将专案目录 `git mv` 移入本仓或主仓对应的 `已完成/` 子目录 | `docs_lint.py --check-structure` |
| 执行 `release_tag.sh` 多仓协同发版打标 | 更新 `docs/08-跨仓协同/compatibility-matrix.md` 与 `docs/01-版本记录/CHANGELOG.md` | `release_gate_audit.sh`、`release_tag.sh --analyze` |

---

## 4. 薄索引 `AGENTS.md` 与只读投影约束

1. **薄索引上限（`<= 120` 行）**：主仓与全部 5 个子仓根目录均维护一份 `AGENTS.md`，物理行数不超过 **120 行**，仅承载启动/验证命令速查、模块与 `docs/` 导航、核心契约入口及 Top 5 高频踩坑提示，长篇规则与架构说明下沉至 `.agents/rules/` 或 `docs/`。
2. **禁止直改投影与镜像**：`<subrepo>/docs/contracts-ref/` 下的只读协议投影副本及各编辑器镜像目录（`.cursor`、`.claude`、`.trae` 等）均由 `infra-rules-skills-sync` 单向生成，修改须回到主源后重新同步。
