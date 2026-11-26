---
name: "a-run"
description: "实施计划执行器。按 tasks.md 依赖顺序执行编码实施、逐条核验验收清单(AC)、排查环境日志并完成模式 A 归档。关键词：实施执行/Tasks/任务执行/计划落地/编码实施/implement tasks/a-run。"
argument-hint: "可选的目标目录、任务过滤或实施指导"
compatibility: "需要 .specify/ 目录与 tasks.md"
user-invocable: true
disable-model-invocation: false
---

# 实施计划执行 (`/a-run`)

按 `tasks.md` 落地代码、核验 AC、检查环境日志并完成模式 A 归档。

## 输入

```text
$ARGUMENTS
```

## 执行步骤

1. **定位专案与加载上下文**：
   - 运行 `.specify/scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks`（若 `$ARGUMENTS` 指定了专案或需防指针漂移，显式传 `--feature <目录>`；含单引号用 `'\''` 转义）。
   - 读取 `spec.md`、`plan.md`、`tasks.md`（以及存在时的 `.specify/memory/constitution.md`）。若历史专案另有补充文档，按需兼读。

2. **代码定位（CodeGraph 优先）**：
   - 若仓库根目录存在 `.codegraph/`：
     - 使用前先执行 `codegraph sync` 防索引陈旧；
     - **跨层链路 / 符号定位**：`codegraph explore "<符号名或问题>"`；
     - **全库调用点 / 影响面审计**：`codegraph node <函数/类/组件名>` 检查 callers。
   - 无 `.codegraph/` 时降级使用 `grep` / `find`。
   - 修改任何文件前必须先 `read_file` 读取最新真实源码，严禁直接盲信索引快照。

3. **按依赖顺序实施（TDD）**：
   - 依照 `tasks.md` 的「一、执行任务」顺序推进；标记 `[P]` 且修改不同文件的任务可并行，**影响同一文件的任务必须串行**。
   - **TDD 循环**：核心逻辑先执行测试任务确认失败（Red），再编写最小实现使测试通过（Green），随后按需重构（Refactor）。
   - **错误处理与实时标记**：每完成一项任务立即在 `tasks.md` 勾选 `- [x]`；非并行任务失败则暂停排查修通，并行任务 `[P]` 继续完成其余项并报告失败项。
   - 涉后端 DTO/API 变更时，同步运行 `tilo-backend-app/backend/generate_openapi.py` 更新契约。

4. **质量门禁、日志排查与 AC 核验**：
   - **增量静态检查**：仅对本次变更文件执行对应工程的 `ruff check` + `mypy` 或 `pnpm lint` + `pnpm typecheck`。
   - **测试复跑**：逐字复跑 `plan.md` 与 `tasks.md` 中的测试命令，核实 `collected > 0, passed > 0`（严禁把空收集当作通过）；涉及大模型返回内容的任务，须执行至少 3 次 Live LLM 真实测试验证稳定收敛。
   - **环境日志排查（强制）**：检查 `tilo-backend-app/backend/logs/{env}_{port}/error.log`（或 `tilo-core-engine/logs/...`）、`/var/log/nginx/error.log`、`docker logs law_db_dev` / `law_minio` 与前端控制台，确认无新增未捕获异常、Traceback 或 500/502 报错。
   - **逐条核验 AC**：对照 `tasks.md` 中的「二、验收清单 (AC)」逐项验证并勾选 `- [x]`；若实现相对原方案有调整，反向同步更新 `spec.md` / `plan.md`，保持文档与代码一致。

5. **模式 A 专案归档**：
   - 全部任务与 AC 通过后，使用 `git mv` 将专案目录完整移动至对应仓 `已完成/` 目录保留底稿，不做物理删除（无需维护中心化总清单）：
     - 主仓专案：`git mv "docs/00-7待办/<分层>/<专案>" "docs/00-7待办/已完成/<专案>"`
     - 子仓专案：`git mv "<subrepo>/docs/00-待办/<专案>" "<subrepo>/docs/00-待办/已完成/<专案>"`
   - 清空 `.specify/feature.json`：
     ```bash
     jq -cn '{"feature_directory":""}' > .specify/feature.json 2>/dev/null || printf '{"feature_directory":""}\n' > .specify/feature.json
     ```
   - 若 `.specify/extensions/agent-context/scripts/bash/update-agent-context.sh` 存在，执行它刷新上下文指针。

6. **完成汇报与 Review 门禁**：
   - 依据 `.specify/extensions.yml` 提示可选后置动作（如 `code-review`、`codegraph sync`）。
   - 向用户呈报：变更文件清单、静态检查与测试通过凭据（含用例数）、日志检查结果及归档路径。
   - **所有变更保留在本地工作区等待用户 Review，严禁未经用户明确确认私自执行 `git commit` 或 `git push`。**
