---
name: "a-tasks"
description: "任务清单(tasks.md)生成器 / Task List Generator with dependency ordering。基于现有设计产物(spec.md/plan.md)，为当前功能生成带有依赖顺序且可执行的任务清单。适用场景：spec 和 plan 完成后需要拆分为具体可执行任务、开发实施前需要任务编排、需要明确任务依赖关系和执行顺序、工作量评估和分配。关键词：任务清单/Tasks/任务拆分/依赖排序/任务编排/task list/task breakdown/dependency ordering/task planning/work breakdown。"
argument-hint: "可选的任务生成约束"
compatibility: "需要 spec-kit 项目结构，包含 .specify/ 目录"
metadata:
  author: "github-spec-kit"
  source: "templates/commands/tasks.md"
user-invocable: true
disable-model-invocation: false
---

## 用户输入

```text
$ARGUMENTS
```

你**必须**在继续之前考虑用户输入（如果非空）。

## 生命阶段组合 (Lifecycle Composition)

本技能承载 `feature-dev-lifecycle` 组合技能的 **阶段 2：架构 → 阶段 4：编码** 的过渡衔接，负责将设计产物拆解为带有依赖排序的 `tasks.md` 执行清单。

## 前置检查

**检查扩展钩子（生成任务前）**：
- 检查项目根目录下是否存在 `.specify/extensions.yml`
- 如果存在，读取它并查找 `hooks.before_tasks` 键下的条目
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

1. **设置**（支持多计划并行——**必须**显式指定目标功能，不得盲目依赖 `.specify/feature.json` 默认值）：
   - **功能发现**：若 `$ARGUMENTS` 中明确提到功能名或路径（如 `005-statutes-page-redesign` 或 `docs/00-7待办/04-混合/005-statutes-page-redesign`），**必须**运行：
     ```bash
     .specify/scripts/bash/setup-tasks.sh --json --feature <功能目录相对路径>
     ```
     解析返回的 FEATURE_DIR、TASKS_TEMPLATE 和 AVAILABLE_DOCS 列表。这是推荐用法，可避免被 `.specify/feature.json` 中残留的"当前功能"指针误导。
   - **未明确指定功能时**：先运行 `.specify/scripts/bash/setup-tasks.sh --json --all` 列出所有已发现的功能（含 name/FEATURE_DIR/has_spec/has_plan/has_tasks/AVAILABLE_DOCS），结合上下文推断目标功能。若推断不确定，**必须**向用户确认要为哪个功能生成 tasks。推断确定后，仍以 `--feature <dir>` 显式调用，而非省略参数。
   - `FEATURE_DIR` 和 `TASKS_TEMPLATE` 在提供时必须是绝对路径。`AVAILABLE_DOCS` 是 `FEATURE_DIR` 下可用的文档名称/相对路径列表（例如 `research.md` 或 `contracts/`）。对于参数中的单引号（如 "I'm Groot"），使用转义语法：例如 'I'\''m Groot'（或尽可能使用双引号："I'm Groot"）。
   - **注意**：`--feature` 会将该功能持久化为 `.specify/feature.json` 的"当前功能"（符合既有行为）。多个功能并行推进时，每次调用都通过 `--feature` 显式指定，结果正确性不受"当前功能"指针跳动影响。

2. **加载设计文档**：从 FEATURE_DIR 读取：
   - **必需**：plan.md（架构、结构）、spec.md（含优先级的用户故事）
   - **可选**：data-model.md（实体）、contracts/（接口契约）、research.md（决策）、quickstart.md（测试场景）
   - **如果存在**：加载 `.specify/memory/constitution.md` 了解项目原则和治理约束
   - **注意**：并非所有项目都有所有文档。基于可用内容生成任务。

3. **执行任务生成工作流**：
   - 加载 plan.md 并提取架构和项目结构
   - 加载 spec.md 并提取用户故事及其优先级（P1、P2、P3 等）
   - 如果 data-model.md 存在：提取实体并映射到用户故事
   - 如果 contracts/ 存在：将接口契约映射到用户故事
   - 如果 research.md 存在：提取设置任务的决策
   - 按用户故事组织生成任务（见下方任务生成规则）
   - 生成显示用户故事完成顺序的依赖图
   - 每个用户故事创建并行执行示例
   - 验证任务完整性（每个用户故事拥有所有需要的任务，可独立测试）

4. **生成 tasks.md**：从 TASKS_TEMPLATE（上面 JSON 输出的）读取任务模板并用作结构。如果 TASKS_TEMPLATE 为空，回退到 `.specify/templates/tasks-template.md`。填入：
   - 来自 plan.md 的正确功能名称
   - 阶段 1：设置任务（项目初始化）
   - 阶段 2：基础任务（所有用户故事的阻塞先决条件）
   - 阶段 3+：每个用户故事一个阶段（按 spec.md 中的优先级顺序）
   - 每个阶段包括：故事目标、独立测试标准、测试（如果要求）、实施任务
   - 最后阶段：打磨与横切关注点
   - 所有任务必须遵循严格的检查清单格式（见下方任务生成规则）
   - 每个任务清晰的文file路径
   - 显示故事完成顺序的依赖关系章节
   - 每个故事的并行执行示例
   - 实施策略章节（MVP 优先、增量交付）

## 强制后置执行钩子

**你必须在向用户报告完成之前完成本节。**

检查项目根目录下是否存在 `.specify/extensions.yml`。
- 如果不存在，或没有在 `hooks.after_tasks` 键下注册任何钩子，跳到完成报告
- 如果存在，读取它并查找 `hooks.after_tasks` 键下的条目
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

输出生成的 tasks.md 路径和摘要：
- 总任务数
- 每个用户故事的任务数
- 识别的并行机会
- 每个故事的独立测试标准
- 建议的 MVP 范围（通常仅限用户故事 1）
- 格式验证：确认所有任务遵循检查清单格式（复选框、ID、标签、文件路径）

任务生成上下文：$ARGUMENTS

tasks.md 应立即可执行——每个任务必须足够具体，使 LLM 无需额外上下文即可完成。

## 任务生成规则

**关键**：任务必须按用户故事组织，以实现独立实施和测试。

**测试是强制的**：每个功能必须生成测试任务。设置阶段必须包含测试框架初始化与测试基础设施搭建。每个用户故事必须先生成测试任务（单元测试/集成测试），再生成实现任务。测试任务必须排在实现任务之前。

### 检查清单格式（必需）

每个任务必须严格遵循此格式：

```text
- [ ] [任务ID] [P?] [故事?] 描述及文件路径
```

**格式组成**：

1. **复选框**：始终以 `- [ ]` 开头（markdown 复选框）
2. **任务 ID**：按执行顺序的顺序号（T001、T002、T003...）
3. **[P] 标记**：仅当任务可并行时包含（不同文件，无对未完成任务依赖）
4. **[故事] 标签**：仅用户故事阶段任务必需
   - 格式：[US1]、[US2]、[US3] 等（映射到 spec.md 中的用户故事）
   - 设置阶段：无故事标签
   - 基础阶段：无故事标签
   - 用户故事阶段：必须有故事标签
   - 打磨阶段：无故事标签
5. **描述**：包含确切文件路径的清晰操作

**示例**：

- ✅ 正确：`- [ ] T001 按实施计划创建项目结构`
- ✅ 正确：`- [ ] T005 [P] 在 src/middleware/auth.py 中实现认证中间件`
- ✅ 正确：`- [ ] T012 [P] [US1] 在 src/models/user.py 中创建 User 模型`
- ✅ 正确：`- [ ] T014 [US1] 在 src/services/user_service.py 中实现 UserService`
- ❌ 错误：`- [ ] 创建 User 模型`（缺少 ID 和故事标签）
- ❌ 错误：`T001 [US1] 创建模型`（缺少复选框）
- ❌ 错误：`- [ ] [US1] 创建 User 模型`（缺少任务 ID）
- ❌ 错误：`- [ ] T001 [US1] 创建模型`（缺少文件路径）

### 任务组织

1. **来自用户故事（spec.md）**——主要组织方式：
   - 每个用户故事（P1、P2、P3...）获得自己的阶段
   - 将所有相关组件映射到其故事：
     - 该故事需要的模型
     - 该故事需要的服务
     - 该故事需要的接口/UI
     - 该故事特定的测试（必须，且排在实现任务之前）
   - 标记故事依赖关系（大多数故事应独立）

2. **来自契约**：
   - 将每个接口契约 → 映射到它服务的用户故事
   - 如果要求测试：每个接口契约 → 在该故事阶段的实施之前添加契约测试任务 [P]

3. **来自数据模型**：
   - 将每个实体映射到需要它的用户故事
   - 如果实体服务多个故事：放在最早的故事或设置阶段
   - 关系 → 在适当故事阶段的服务层任务

4. **来自设置/基础设施**：
   - 共享基础设施 → 设置阶段（阶段 1）
   - 基础/阻塞任务 → 基础阶段（阶段 2）
   - 故事特定设置 → 在该故事阶段内

### 阶段结构

- **阶段 1**：设置（项目初始化）
- **阶段 2**：基础（阻塞先决条件——必须在用户故事前完成）
- **阶段 3+**：按优先级顺序的用户故事（P1、P2、P3...）
   - 在每个故事内：测试 → 模型 → 服务 → 端点 → 集成
   - 每个阶段应是一个完整的、可独立测试的增量
- **最后阶段**：打磨、日志报错审计与专案归档（强制包含以下固定任务）
   - **代码质量门禁任务**：必须包含针对变更文件的 `ruff check`、`mypy`、`pnpm lint` 与 `pnpm typecheck`。
   - **日志报错审计强制任务**：必须包含对环境日志（`tilo-backend-app/backend/logs/{APP_ENV}_{BACKEND_PORT}/error.log`、Nginx `/var/log/nginx/error.log`、前端控制台）的完整报错审查任务，确保无新增未处理异常。
   - **任务完成归档任务（强制）**：任务验收闭环后，原始方案与脚手架不做物理删除，统一由活跃专案目录（主仓 `docs/00-7待办/04-混合/<专案>/` 或子仓 `<subrepo>/docs/00-待办/<专案>/`）使用 `git mv` 完整移动至对应仓的 `已完成/<专案>/` 目录保留复盘底稿，未来由人工定期手动批量清理。物理目录位置即状态，废弃原历史单一汇总文件与中心化总清单。

### 环境日志路径速查

- 后端 API: `backend/logs/{env}_{port}/error.log` (及全量 `backend.log`)
- Nginx 代理: `/var/log/nginx/error.log`
- DB/容器: `docker logs law_db_dev` / `docker logs law_minio`
- 前端应用: DevTools Console 与 `npm run dev` 终端控制台
- 异步 Task: `<appDataDir>/brain/<conversation-id>/.system_generated/logs/`

## 完成条件

- [ ] tasks.md 已生成，包含所有阶段、任务 ID、文件路径及日志报错审查任务
- [ ] 扩展钩子已根据上述强制后置执行钩子中的规则分发或跳过
- [ ] 完成报告已向用户呈现任务数、故事分解和 MVP 范围
