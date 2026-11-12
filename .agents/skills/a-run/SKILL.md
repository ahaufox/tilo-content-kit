---
name: "a-run"
description: "实施计划执行器 / Execute Implementation Plan (tasks.md)。处理并执行 tasks.md 中定义的所有任务，按依赖顺序完成编码实施。适用场景：tasks.md 编写完成后需要逐一执行任务、按计划分步实现功能、需要跟踪每个任务的完成进度、开发阶段从方案到代码的落地执行。关键词：实施执行/Tasks/任务执行/计划落地/编码实施/implement tasks/task execution/implementation plan/plan execution/feature delivery。"
argument-hint: "可选的实施指导或任务过滤器"
compatibility: "需要 spec-kit 项目结构，包含 .specify/ 目录"
metadata:
  author: "github-spec-kit"
  source: "templates/commands/implement.md"
user-invocable: true
disable-model-invocation: false
---

## 用户输入

```text
$ARGUMENTS
```

你**必须**在继续之前考虑用户输入（如果非空）。

## 生命阶段组合 (Lifecycle Composition)

本技能承载 `feature-dev-lifecycle` 组合技能的 **阶段 4：编码 (Coding)** 与 **阶段 5：验证 (Verification)**。它基于 `/implement` 的底层编码与防呆规范，专注于按 `tasks.md` 依赖顺序推进任务树与更新文档进度。

## 代码定位与结构探索规范

在执行本技能的代码查找与依赖分析时，请遵守以下优先级与防呆规则：

1. **优先使用 CodeGraph（当 `.codegraph/` 目录存在时）**：
   - **防陈旧索引**：使用前必须先在终端执行 `codegraph sync`，确保索引数据库反映最新代码变动。
   - **三大场景运用**：
     - **场景 1（跨层链路追溯）**：使用命令行 `codegraph explore "<符号名/问题>"` 批量获取源码及跨层调用关系链（Call Chain）。
     - **场景 2（全库调用点审计/影响面分析）**：使用命令行 `codegraph node <函数/类/组件名>` 检查其 callers，确保影响面审计零遗漏。
     - **场景 3（架构与符号定位）**：使用命令行 `codegraph explore "<数据结构/接口名>"` 快速定位全局符号定义。
   - **真实性校验**：通过 CodeGraph 定位到具体文件位置后，**必须使用文件查看工具读取最新真实源码内容**，严禁直接无条件盲信索引快照。

2. **降级兜底（当未建立 CodeGraph 索引时）**：
   - 使用 `grep` / `find` 或开发工具进行标准文本匹配。

## 前置检查

**检查扩展钩子（实施前）**：
- 检查项目根目录下是否存在 `.specify/extensions.yml`
- 如果存在，读取它并查找 `hooks.before_implement` 键下的条目
- 如果 YAML 无法解析或无效，静默跳过钩子检查并正常继续
- 过滤掉 `enabled` 显式为 `false` 的钩子。将没有 `enabled` 字段的钩子视为默认启用
- 对于每个剩余的钩子，**不要**尝试解释或评估钩子的 `condition` 表达式：
  - 如果钩子没有 `condition` 字段，或为 null/空，则视该钩子为可执行
  - 如果钩子定义了非空的 `condition`，跳过该钩子，将条件评估留给 HookExecutor 实现
- 从钩子命令名构造斜杠命令时，将点号（`.`）替换为连字符（`-`）。例如 `speckit.git.commit` → `/speckit-git-commit`
- 对于每个可执行的钩子，根据其 `optional` 标志输出以下内容：
  - **可选钩子**（`optional: true`）：
    ```
    ## 扩展钩子

    **可选前置钩子**：{extension}
    命令：`/{command}`
    描述：{description}

    提示：{prompt}
    执行：`/{command}`
    ```
  - **强制钩子**（`optional: false`）：
    ```
    ## 扩展钩子

    **自动前置钩子**：{extension}
    执行：`/{command}`
    EXECUTE_COMMAND：{command}

    在继续到大纲之前等待钩子命令的结果。
    ```
- 如果没有注册任何钩子或 `.specify/extensions.yml` 不存在，则静默跳过

## 大纲

1. 从仓库根目录运行 `.specify/scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks`，解析 FEATURE_DIR 和 AVAILABLE_DOCS 列表。所有路径必须是绝对路径。对于参数中的单引号（如 "I'm Groot"），使用转义语法：例如 'I'\''m Groot'（或尽可能使用双引号："I'm Groot"）。

2. **检查检查清单状态**（如果 FEATURE_DIR/checklists/ 存在）：
   - 扫描 checklists/ 目录中的所有检查清单文件
   - 对每个检查清单，计数：
     - 总项数：所有匹配 `- [ ]` 或 `- [X]` 或 `- [x]` 的行
     - 已完成项：匹配 `- [X]` 或 `- [x]` 的行
     - 未完成项：匹配 `- [ ]` 的行
   - 创建状态表：

     ```text
     | 检查清单 | 总数 | 已完成 | 未完成 | 状态 |
     |---------|------|--------|--------|------|
     | ux.md   | 12   | 12     | 0      | ✓ 通过 |
     | test.md | 8    | 5      | 3      | ✗ 失败 |
     | security.md | 6 | 6    | 0      | ✓ 通过 |
     ```

   - 计算整体状态：
     - **通过**：所有检查清单的未完成项都为 0
     - **失败**：一个或多个检查清单有未完成项

   - **如果任何检查清单未完成**：
     - 显示包含未完成项计数的表格
     - **停止**并询问："某些检查清单未完成。是否仍要继续实施？（yes/no）"
     - 等待用户回复后再继续
     - 如果用户说 "no" 或 "wait" 或 "stop"，暂停执行
     - 如果用户说 "yes" 或 "proceed" 或 "continue"，继续到步骤 3

   - **如果所有检查清单已完成**：
     - 显示所有检查清单通过的表格
     - 自动继续到步骤 3

3. 加载并分析实施上下文：
   - **必需**：读取 tasks.md 获取完整任务列表和执行计划
   - **必需**：读取 plan.md 获取架构和文件结构
   - **如果存在**：读取 data-model.md 获取实体和关系
   - **如果存在**：读取 contracts/ 获取 API 规范和测试要求
   - **如果存在**：读取 research.md 获取技术决策和约束
   - **如果存在**：读取 .specify/memory/constitution.md 获取治理约束
   - **如果存在**：读取 quickstart.md 获取集成场景
   - **如果存在**：读取 FEATURE_DIR/CONTEXT.md 获取领域统一语言（术语一致性），如 `docs/00-7待办/04-混合/014-edit-history-unification/CONTEXT.md`
   - **如果存在**：读取仓库根目录 CONTEXT.md 获取全栈通用领域语言（Ubiquitous Language）
   - **如果存在**：读取 FEATURE_DIR/ADR/ 目录下的全部 adr-*.md 获取架构决策记录（ADR）

4. **项目设置验证**：
   - **必需**：基于实际项目设置创建/验证忽略文件：

   **检测与创建逻辑**：
   - 检查以下命令是否成功以确定仓库是否为 git 仓库（如果是，创建/验证 .gitignore）：

     ```sh
     git rev-parse --git-dir 2>/dev/null
     ```

   - 检查 Dockerfile* 是否存在或 plan.md 中有 Docker → 创建/验证 .dockerignore
   - 检查 .eslintrc* 是否存在 → 创建/验证 .eslintignore
   - 检查 eslint.config.* 是否存在 → 确保配置的 `ignores` 条目覆盖必要模式
   - 检查 .prettierrc* 是否存在 → 创建/验证 .prettierignore
   - 检查 .npmrc 或 package.json 是否存在 → 创建/验证 .npmignore（如果发布）
   - 检查 terraform 文件（*.tf）是否存在 → 创建/验证 .terraformignore
   - 检查是否需要 .helmignore（存在 helm 图表） → 创建/验证 .helmignore

   **如果忽略文件已存在**：验证它包含必要模式，仅追加缺失的关键模式
   **如果忽略文件缺失**：为检测到的技术栈创建完整模式集

   **按项目类型的常见忽略模式**：
   - **Node.js/JavaScript/TypeScript**：`node_modules/`、`dist/`、`build/`、`*.log`、`.env*`
   - **Python**：`__pycache__/`、`*.pyc`、`.venv/`、`venv/`、`dist/`、`*.egg-info/`
   - **Java**：`target/`、`*.class`、`*.jar`、`.gradle/`、`build/`
   - **C#/.NET**：`bin/`、`obj/`、`*.user`、`*.suo`、`packages/`
   - **Go**：`*.exe`、`*.test`、`vendor/`、`*.out`
   - **Ruby**：`.bundle/`、`log/`、`tmp/`、`*.gem`、`vendor/bundle/`
   - **PHP**：`vendor/`、`*.log`、`*.cache`、`*.env`
   - **Rust**：`target/`、`debug/`、`release/`、`*.rs.bk`、`*.rlib`、`*.prof*`、`.idea/`、`*.log`、`.env*`
   - **Kotlin**：`build/`、`out/`、`.gradle/`、`.idea/`、`*.class`、`*.jar`、`*.iml`、`*.log`、`.env*`
   - **C++**：`build/`、`bin/`、`obj/`、`out/`、`*.o`、`*.so`、`*.a`、`*.exe`、`*.dll`、`.idea/`、`*.log`、`.env*`
   - **C**：`build/`、`bin/`、`obj/`、`out/`、`*.o`、`*.a`、`*.so`、`*.exe`、`*.dll`、`autom4te.cache/`、`config.status`、`config.log`、`.idea/`、`*.log`、`.env*`
   - **Swift**：`.build/`、`DerivedData/`、`*.swiftpm/`、`Packages/`
   - **R**：`.Rproj.user/`、`.Rhistory`、`.RData`、`.Ruserdata`、`*.Rproj`、`packrat/`、`renv/`
   - **通用**：`.DS_Store`、`Thumbs.db`、`*.tmp`、`*.swp`、`.vscode/`、`.idea/`

   **工具特定模式**：
   - **Docker**：`node_modules/`、`.git/`、`Dockerfile*`、`.dockerignore`、`*.log*`、`.env*`、`coverage/`
   - **ESLint**：`node_modules/`、`dist/`、`build/`、`coverage/`、`*.min.js`
   - **Prettier**：`node_modules/`、`dist/`、`build/`、`coverage/`、`package-lock.json`、`yarn.lock`、`pnpm-lock.yaml`
   - **Terraform**：`.terraform/`、`*.tfstate*`、`*.tfvars`、`.terraform.lock.hcl`
   - **Kubernetes/k8s**：`*.secret.yaml`、`secrets/`、`.kube/`、`kubeconfig*`、`*.key`、`*.crt`

5. 解析 tasks.md 结构并提取：
   - **任务阶段**：设置、测试、核心、集成、打磨
   - **任务依赖**：串行 vs 并行执行规则
   - **任务详情**：ID、描述、文件路径、并行标记 [P]
   - **执行流程**：顺序和依赖要求

6. 按照任务计划执行实施：
   - **逐阶段执行**：完成每个阶段后再进入下一个
   - **尊重依赖关系**：按顺序运行串行任务，并行任务 [P] 可以一起运行
   - **TDD 强制**：必须严格遵循 Red（写测试）→ Green（写最小实现）→ Refactor（重构）三步循环。每个实现任务之前必须先执行其对应的测试任务并看到测试失败（Red），再编写实现代码使测试通过（Green）。测试失败时立即中断，修复后方可继续。
   - **基于文件的协调**：影响同一文件的任务必须串行运行
   - **验证检查点**：在继续前验证每个阶段完成

7. 实施执行规则：
   - **先做设置**：初始化项目结构、依赖、配置
   - **测试先于代码**：必须为所有功能（契约、实体、集成场景）编写测试，测试通过后再编写实现代码。
   - **核心开发**：实现模型、服务、CLI 命令、端点
   - **集成工作**：数据库连接、中间件、日志、外部服务
   - **打磨和验证**：单元测试、性能优化、文档

8. 进度跟踪和错误处理：
   - 每个任务完成后报告进度
   - 如果任何非并行任务失败，暂停执行
   - 对于并行任务 [P]，继续处理成功的任务，报告失败的任务
   - **日志报错检查（强制）**：执行每个编码/调试任务后，必须查看 `backend/logs/{env}_{port}/error.log`（后端）、`/var/log/nginx/error.log`（Nginx）与前端控制台，排除 Traceback 与 500 异常
   - 提供带有上下文的清晰错误信息以便调试
   - 如果实施无法继续，建议下一步操作
   - **重要**：对于已完成的任务，确保在 tasks 文件中将该任务标记为 [X]

9. 完成验证：
   - 验证所有必需任务是否已完成
   - 检查实施的功能是否匹配原始规格
   - 验证测试通过且覆盖满足要求
   - 确认实施遵循技术计划
   - **检查相关环境日志无报错**：确认 `tilo-backend-app/backend/logs/{APP_ENV}_{BACKEND_PORT}/error.log`（或核心引擎 `tilo-core-engine/logs/...`）、Nginx 与前端 Console 没有新引入的 ERROR 级别报错记录，否则不予通过完成验证。

10. **专案归档保留复盘底稿（模式 A 规范）**：

    **目的**：任务验收闭环后，原始方案与脚手架不做物理删除，统一由活跃专案目录移动至对应仓的 `已完成/` 目录保留复盘底稿，未来由人工定期手动批量清理。物理目录位置即状态，废弃原历史单一汇总文件与中心化总清单。

    **步骤**：
    1. **整包归档（保留底稿）**：使用 `git mv` 将活跃专案目录完整移动至对应仓的 `已完成/` 目录：
       - 主仓混合专案：`git mv "docs/00-7待办/04-混合/$FEATURE_NAME" "docs/00-7待办/已完成/$FEATURE_NAME"`
       - 子仓独立专案：`git mv "<subrepo>/docs/00-待办/$FEATURE_NAME" "<subrepo>/docs/00-待办/已完成/$FEATURE_NAME"`
    2. **无需维护中心化总清单**：目录即状态，不再追加中心化清单文件。

    6. 通过更新 `.specify/feature.json` 清除功能上下文：
       ```bash
       # 仅当归档成功时清除
       # 写入空的 feature_directory 以表示无活动功能
       jq -cn '{"feature_directory":""}' > "$REPO_ROOT/.specify/feature.json"
       ```
       （如果 `jq` 不可用，使用 `printf '{"feature_directory":""}\n'` 作为回退。）

    7. 刷新智能体上下文以移除指向已归档计划的指针：
       ```bash
       # 运行 agent-context 更新脚本以刷新 CLAUDE.md/AGENTS.md
       # 归档后，没有活动计划保留，因此 SPECKIT 部分
       # 将删除具体的计划路径引用。
       if [ -f "$REPO_ROOT/.specify/extensions/agent-context/scripts/bash/update-agent-context.sh" ]; then
         bash "$REPO_ROOT/.specify/extensions/agent-context/scripts/bash/update-agent-context.sh"
       fi
       ```

    8. 报告：
       ```
       ✅ 成果已归档至：docs/00-7待办/已完成/{FEATURE_NAME}
       📁 已移动功能专案目录至已完成归档区
       📍 功能上下文已清除（.specify/feature.json）
       ```

注意：此命令假定 tasks.md 中存在完整的任务分解。如果任务不完整或缺失，建议先运行 `/a-tasks` 重新生成任务列表。

## 强制后置执行钩子

**你必须在向用户报告完成之前完成本节。**

检查项目根目录下是否存在 `.specify/extensions.yml`。
- 如果不存在，或没有在 `hooks.after_implement` 键下注册任何钩子，跳到完成报告
- 如果存在，读取它并查找 `hooks.after_implement` 键下的条目
- 如果 YAML 无法解析或无效，静默跳过钩子检查并继续到完成报告
- 过滤掉 `enabled` 显式为 `false` 的钩子。将没有 `enabled` 字段的钩子视为默认启用
- 对于每个剩余的钩子，**不要**尝试解释或评估钩子的 `condition` 表达式：
  - 如果钩子没有 `condition` 字段，或为 null/空，则视该钩子为可执行
  - 如果钩子定义了非空的 `condition`，跳过该钩子，将条件评估留给 HookExecutor 实现
- 从钩子命令名构造斜杠命令时，将点号（`.`）替换为连字符（`-`）。例如 `speckit.git.commit` → `/speckit-git-commit`
- 对于每个可执行的钩子，根据其 `optional` 标志输出以下内容：
  - **强制钩子**（`optional: false`）——**你必须为每个强制钩子输出 `EXECUTE_COMMAND:`**：
    ```
    ## 扩展钩子

    **自动钩子**：{extension}
    执行：`/{command}`
    EXECUTE_COMMAND：{command}
    ```
  - **可选钩子**（`optional: true`）：
    ```
    ## 扩展钩子

    **可选钩子**：{extension}
    命令：`/{command}`
    描述：{description}

    提示：{prompt}
    执行：`/{command}`
    ```

## 完成报告

报告最终状态并提供已完成工作的摘要。

## 完成条件

- [ ] tasks.md 中的所有任务已完成并标记为 `[X]`
- [ ] 实施已根据规格、计划和测试覆盖进行验证
- [ ] 已显式检查本地环境日志（`backend/logs/{env}_{port}/error.log`、Nginx `/var/log/nginx/error.log` 及前端控制台），确认无未处理的 ERROR 报错
- [ ] 扩展钩子已根据上述强制后置执行钩子中的规则分开或跳过
- [ ] 完成报告已向用户呈现已完成工作的摘要
