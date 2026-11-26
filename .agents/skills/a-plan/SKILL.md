---
name: "a-plan"
description: "实施方案规划工作流。基于代码现状穿透核查，生成单一精简的 plan.md 并执行静态防腐自检。适用场景：新功能设计、技术方案制定、从 spec 到 plan。关键词：方案规划/实施计划/plan/architecture plan。"
argument-hint: "目标专案目录/编号或规划指导"
compatibility: "需要 .specify/ 目录与 plan_audit_guard.py"
user-invocable: true
disable-model-invocation: false
---

# 实施方案规划 (`/a-plan`)

本技能只产出单一 `plan.md`（目标 ≤ 150 行），**不再单独生成** `research.md`、`data-model.md`、`quickstart.md` 或 `contracts/`。

## 输入

```text
$ARGUMENTS
```

## 执行步骤

1. **专案目录归位与多计划并行定位（Target Directory SSOT）**：
   - **目标目录规划规范**：专案必须位于标准目录，严禁散落根目录或非规范路径：
     - 主仓四维分层：`docs/00-7待办/01-前端/<NNN-主题>/`、`02-backend/<NNN-主题>/`、`03-core-backend/<NNN-主题>/`、`04-混合/<NNN-主题>/`；
     - 单子仓自治：`<subrepo>/docs/00-待办/<NNN-主题>/`。
   - **专案目录编号规范 (`NNN`)**：目录名前缀采用三位递增数字（如 `132-xxx`）。全局扫描主仓 `docs/00-7待办/`（四层子目录）与 `docs/00-7待办/已完成/`、以及各子仓 `<subrepo>/docs/00-待办/` 与 `已完成/` 下现存所有以三位数字开头的目录，取当前全局最大数字 `+ 1`（`>= 500` 段位专供外部工单特例，不参与常规递增计算）。
   - **定位策略（严禁盲目依赖默认指针）**：
     - **场景 A（指定已有专案）**：运行 `.specify/scripts/bash/setup-plan.sh --json --feature <目录相对路径>`；
     - **场景 B（全新需求）**：评估技术域选分层、计算 `NNN` 并提炼主题短名后，运行 `setup-plan.sh --json --feature <目标目录路径>`；
     - **场景 C（未明确指定）**：先运行 `.specify/scripts/bash/setup-plan.sh --json --all` 列出全部已发现专案，结合上下文推断或向用户确认后，再显式传 `--feature <目录>`（参数含单引号时用 `'\''` 转义；`--feature` 会更新 `.specify/feature.json` 当前指针）。
   - 读取同目录 `spec.md`（存在时）与 `.specify/memory/constitution.md`（存在时，仅作约束检查，不在 `plan.md` 复述）。

2. **代码现状穿透核查（铁证原则，先查实情再写方案）**：
   - 使用 `codegraph` / `grep` / `read_file` 穿透核查源码，所有现状陈述必须附带真实相对路径与精确行号（如 `path/to/file.py:L15-30`），严禁凭空臆造。
   - 按以下 **六大防呆维度** 逐项自检（**写入 `plan.md` 时仅输出本次命中的真实维度，未涉及的维度零字输出，不强凑空表**）：
     1. **真实数据模型与存储映射**：涉读写或 DTO 对齐时，打开真实 ORM（`tilo-backend-app/backend/models/`）与 Alembic 核验真实列名（如 `original_filename` 而非 `filename`）、软删语义（`status == "deleted"` vs `is_deleted`）、naive CST 时间字段是否显式声明 `sa_type=DateTime(timezone=False)`；
     2. **既有构件复用对账**：全仓检索已有 Repository / Service / Hook / 公共 Schema，优先复用成熟封装，不重复造轮子；
     3. **调用拓扑与符号可达性**：全库 grep 目标符号调用点，区分活跃链路 / 休眠适配 / 过渡残留，清点多处同名变体或散落桩类的构造语义差异；
     4. **真实鉴权守卫、上下文与缓存链路**：核验端点真实守卫（如 `require_case_access`）与状态码（403 vs 404）、Zero-DB / 显式 `user_id` 传参、Redis 缓存键写路径是否有明确 delete/invalidate（禁止虚指“已有机制自动失效”）；
     5. **工程配置与行数门禁水位**：核查拟改文件物理行数（Page ≤ 250 / UI 面板 ≤ 500 / Hook ≤ 350 / 后端与前端通用模块 ≤ 600）及 `mypy.ini` / `ruff.toml` 配置，超限或濒临阈值（≥90%）必须明确拆离/拆子组件策略；
     6. **存量测试基线与夹具现实**：核查关联存量测试与 fixtures 构造（防止缺字段致新分支静默零覆盖），记录必跑冒烟回归。
   - 若存在重大未决设计方案或用户偏好冲突，先集中追问确认（一次一问或简洁选项表，附推荐项）再落笔。

3. **写入单一 `plan.md`**：
   - 套用 `.specify/templates/plan-template.md` 写入 `<专案目录>/plan.md`（目标 ≤ 150 行），所有源码路径必须使用真实多仓路径（`tilo-backend-app/backend/{routers,services,repositories,models,schemas,tests}/`、`tilo-core-engine/{agents,workflows,contracts,tests}/`、`frontend-v2/src/{app,components,lib,hooks,types}/`、`admin-frontend/`、`prod-dev-ops/`），禁用占位路径。
   - 包含四节：`1. 方案概要`、`2. 代码现状核查`（含拟改文件与行数表 + 命中事实）、`3. 实施设计`（涉表结构/DTO/API 契约直接在本节列表说明，不另开文件）、`4. 验证与风险`（精确可执行的测试命令、增量 lint/typecheck、环境日志检查路径：`tilo-backend-app/backend/logs/{env}_{port}/error.log`、`tilo-core-engine/logs/...`、`/var/log/nginx/error.log`、`docker logs law_db_dev` / `law_minio`、前端 Console 及后台 Task 日志）。
   - 若 `CLAUDE.md` 存在 `<!-- SPECKIT START -->` 区块，同步更新计划指针。

4. **静态防腐自检（必须执行）**：
   ```bash
   python3 .agents/skills/plan-review/scripts/plan_audit_guard.py <专案目录或plan.md> --format=markdown
   ```
   - 核查两项：①「引用源码文件 > 0」且无断链；② 标记为 `FAIL` 或 `DANGER ≥90%` 的文件在 `plan.md` 中已有明确的拆分或最小增量约束，不在超限文件内原地堆砌长逻辑。

5. **完成汇报**：
   - 输出 `plan.md` 路径、方案核心要点、`plan_audit_guard.py` 审计结果摘要，并提示下一步可运行 `/plan-review` 或 `/a-tasks`。
