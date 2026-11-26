---
name: "a-tasks"
description: "任务清单与验收清单(tasks.md)生成器（已合并原 a-ac）。基于 spec.md 与 plan.md 生成按依赖排序的执行任务与可逐条核验的验收清单(AC)。关键词：任务清单/Tasks/验收清单/AC/Checklist/任务拆分/acceptance criteria。"
argument-hint: "可选的目标目录、约束或 '仅更新AC'"
compatibility: "需要 .specify/ 目录"
user-invocable: true
disable-model-invocation: false
---

# 任务与验收清单生成 (`/a-tasks`)

本技能已合并原 `/a-ac`，在单一 `tasks.md` 中维护 **「一、执行任务」** 与 **「二、验收清单 (AC)」**（目标 ≤ 80 行）。

## 输入

```text
$ARGUMENTS
```

## 工作模式

- **完整模式（默认）**：基于 `spec.md` 与 `plan.md` 生成完整 `tasks.md`（执行任务 + 验收清单）。
- **仅补 AC 模式**：当用户要求“补充/更新验收清单 / AC / checklist”且 `tasks.md` 已存在时，仅更新或追加 `## 二、验收清单 (AC)`，保留已勾选任务 `[x]` 状态不变。

## 执行步骤

1. **多计划并行定位与加载文档（禁止盲目依赖 `.specify/feature.json` 默认值）**：
   - 指定了功能名或目录时，显式执行：
     ```bash
     .specify/scripts/bash/setup-tasks.sh --json --feature <目录相对路径>
     ```
   - 未指定时，先运行 `.specify/scripts/bash/setup-tasks.sh --json --all` 列出已发现专案，结合上下文推断或向用户确认后，再以 `--feature <目录>` 显式调用（含单引号用 `'\''` 转义；`--feature` 会同步更新 `.specify/feature.json` 指针）。
   - 读取 `spec.md` 与 `plan.md`（历史专案若含其他补充文档，按需兼读）。

2. **编写 `tasks.md`**（套用 `.specify/templates/tasks-template.md`）：
   - **真实多仓路径约定**：必须使用真实子仓路径（`tilo-backend-app/backend/`、`tilo-core-engine/`、`frontend-v2/`、`admin-frontend/`、`prod-dev-ops/`），禁止臆造 `backend/src/` 等虚拟路径。
   - **一、执行任务**：
     - 按真实依赖顺序扁平列出（复杂需求最多分 2-3 个逻辑分组，不硬凑多阶段空壳）；
     - 严格格式：`- [ ] T01 [P?] <明确动作> — \`真实文件路径\``（`[P]` 表示无前置依赖、修改不同文件可并行）；
       - ✅ `- [ ] T02 [P] 新增覆盖率门禁模块 — \`tilo-backend-app/backend/services/case/evidence/utils/completeness_gate.py\``
       - ❌ `- [ ] 创建门禁模块`（缺少 ID、路径或复选框）
     - 遵循 TDD：核心逻辑先列测试任务（Red），再列对应实现任务（Green）；不把同文件微调拆成多条琐碎任务，也不重复抄写 `plan.md` 长段解释；
     - **末尾固定收尾项**：
       1. 变更文件增量静态检查（业务后端 `ruff check` + `mypy`；核心引擎 `ruff check` + `mypy`；前端 `pnpm lint` + `pnpm typecheck`）；
       2. 复跑关联测试，核对 `collected > 0, passed > 0`（`-k` 表达式须核实真实用例名；涉 LLM 返回内容须执行 ≥ 3 次 Live LLM 验证）；
       3. 检查环境日志（`tilo-backend-app/backend/logs/{env}_{port}/error.log`、`tilo-core-engine/logs/...`、`/var/log/nginx/error.log`、`docker logs law_db_dev` / `law_minio`、前端控制台），确认无新增未捕获异常、Traceback 或 500/502；
       4. 模式 A 归档：验收闭环后使用 `git mv` 将专案目录完整移至对应仓 `已完成/` 目录。
   - **二、验收清单 (AC)**：
     - 提炼 **5~12 条** 可客观核验的功能、边界与质量验收标准（实用验证口径，不再写抽象的“需求质量元检查”）；
     - 严格格式：`- [ ] AC01 <可观测行为 / 接口响应 / 命令或日志断言>（对应 Spec/Plan）`；
     - 覆盖主路径、关键异常降级、权限/越权（如 `require_case_access` 404）及核心边界场景。

3. **完成汇报**：
   - 输出 `tasks.md` 路径、执行任务数、AC 条数与实施顺序摘要，并提示下一步可运行 `/a-run`。
