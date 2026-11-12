---
name: "a-plan"
description: "方案规划工作流 / Solution Planning with Implementation Plan template。使用实施方案模板执行方案规划，生成设计文档(plan.md)与架构制品。适用场景：新功能开发前需要制定实施方案、架构设计需要文档化、技术方案需要评审、从 spec 到 plan 的规划阶段。关键词：方案规划/实施计划/设计文档/架构设计/Solution Plan/规划工作流/solution planning/implementation plan/design doc/architecture plan/plan template。"
argument-hint: "规划阶段的可选指导"
compatibility: "需要 spec-kit 项目结构，包含 .specify/ 目录"
metadata:
  author: "github-spec-kit"
  source: "templates/commands/plan.md"
user-invocable: true
disable-model-invocation: false
---

## 用户输入

```text
$ARGUMENTS
```

你**必须**在继续之前考虑用户输入（如果非空）。

## 生命阶段组合 (Lifecycle Composition)

本技能承载 `feature-dev-lifecycle` 组合技能的 **阶段 1：调研 (Research)** 与 **阶段 2：架构 (Architecture)**。执行本技能即完成 `feature-dev-lifecycle` 前两阶段的规范定义，产出 `research.md`、`plan.md`、`data-model.md` 与 `quickstart.md`。

## 前置检查

**检查扩展钩子（规划前）**：
- 检查项目根目录下是否存在 `.specify/extensions.yml`
- 如果存在，读取它并查找 `hooks.before_plan` 键下的条目
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

1. **设置与目标专案目录归位（SSOT 强制要求）**：
   - **目标目录规划规范 (Target Directory SSOT)**：
     本项目所有通过 `/a-plan` 生成的方案主文档 (`plan.md`) 及架构设计制品（`research.md`、`data-model.md`、`quickstart.md`、`contracts/`），**必须**严格放置在 `docs/00-7待办/` 下的标准四维分层目录中，严禁散落于根目录、`docs/` 或其它非规范路径：
     - `docs/00-7待办/01-前端/<NNN-主题>/`：纯前端 (Next.js / React) 与桌面端 (Electron) 方案
     - `docs/00-7待办/02-backend/<NNN-主题>/`：业务后端服务 (FastAPI / PostgreSQL / Alembic / Router / Service) 方案
     - `docs/00-7待办/03-core-backend/<NNN-主题>/`：核心研判引擎 (tilo-core-engine / Agent / Prompt / Reasoning) 方案
     - `docs/00-7待办/04-混合/<NNN-主题>/`：跨端协同、全栈联动、多仓协作与综合商业化方案

   - **专案目录编号规范 (`NNN`)**：
     - 目录名前缀必须采用三位递增数字（例如 `132-xxx`）。
     - 计算规则：全局扫描 `docs/00-7待办/`（四层子目录）与 `docs/00-7待办/已完成/` 下现存所有以三位数字开头的目录，取当前全局最大数字 `+ 1`（如现存最大为 131 时取 132）。

   - **目标专案定位与发现策略**：
     - **场景 A：指定或关联已有专案**：若 `$ARGUMENTS` 提及已有专案编号或名称（如 `123-官方指南`、`01-前端/123-xxx` 或 `docs/00-7待办/01-前端/123-xxx`），脚本会自动归一化并定位到对应的分层路径，**必须**运行：
       ```bash
       .specify/scripts/bash/setup-plan.sh --json --feature <功能目录相对路径>
       ```
       解析 JSON 获取 FEATURE_SPEC、IMPL_PLAN、SPECS_DIR、BRANCH。
     - **场景 B：为新需求/新功能制定全新 Plan**：
       1. 评估该需求所属的技术域，选择最合适的分层目录（`01-前端` / `02-backend` / `03-core-backend` / `04-混合`）；
       2. 计算获取下一个三位专案编号 `NNN`，生成精炼的主题短名称（例如 `132-batch-case-export`）；
       3. 确定目标专案相对路径为：`docs/00-7待办/<分层>/<NNN-主题>`；
       4. 运行：
          ```bash
          .specify/scripts/bash/setup-plan.sh --json --feature docs/00-7待办/<分层>/<NNN-主题>
          ```
          脚本会自动在目标分层下创建专案目录并复制 `plan.md` 模板。
     - **场景 C：未明确指定功能时**：
       先运行 `.specify/scripts/bash/setup-plan.sh --json --all` 列出所有四维分层下已发现的功能（含 name/FEATURE_DIR/has_spec/has_plan/has_tasks/AVAILABLE_DOCS），结合上下文推断目标功能。若推断不确定，**必须**向用户确认要为哪个功能生成 plan。推断确定后，仍以 `--feature <dir>` 显式调用，而非省略参数。
   - 对于参数中的单引号（如 "I'm Groot"），使用转义语法：例如 'I'\''m Groot'（或尽可能使用双引号："I'm Groot"）。
   - **注意**：`--feature` 会将该功能持久化为 `.specify/feature.json` 的"当前功能"（符合既有行为）。多个功能并行推进时，每次调用都通过 `--feature` 显式指定，结果正确性不受"当前功能"指针跳动影响。

2. **加载上下文**：读取 FEATURE_SPEC 和 `.specify/memory/constitution.md`。加载 IMPL_PLAN 模板（已复制）。

3. **执行规划工作流**：遵循 IMPL_PLAN 模板中的结构：
   - **阶段 0-A：系统现状穿透审计 (System Baseline Reality Audit - 强制前置门禁)**：
     - 调用工具（`grep` / `read_file` / `codegraph`）深入代码库，穿透核查真实源码文件、真实 ORM 字段、既有可复用构件、调用拓扑、鉴权守卫与缓存链路、存量测试与夹具。
     - 严禁凭空脑补代码，所有事实必须附带文件路径和精确代码行号凭据（Zero-Hallucination Evidence）。
     - 完整填写 IMPL_PLAN 中的 `## System Reality & Baseline Analysis` 六大板块。
   - 填写技术上下文与章程检查（评估关卡，如果违规无正当理由则报错）
   - 在项目工程结构（Project Structure）中，**必须使用仓库真实的模块路径**（`backend/routers/services/repositories/models/schemas/tests/`、`frontend-v2/src/app/components/lib/hooks/`、`admin-frontend/`），严禁保留通用的占位符选项
   - **阶段 0-B：技术选型与研究报告 (Research & Decisions)**：生成 `research.md`（包含系统现状审计报告与技术决策）
   - **阶段 1：设计与契约 (Design & Contracts)**：生成 `data-model.md`（附带与后端真实 ORM 字段对齐表）、`contracts/`、`quickstart.md`（包含存量冒烟测试与日志检查路径）
   - **阶段 1：智能体上下文更新**：更新智能体上下文文件
   - 设计后重新评估章程检查
   - **阶段 2：自动化防腐自检门禁 (Automated Audit Gate)**：运行 `plan_audit_guard.py` 自检，确保源码文件已清晰列出且无门禁超限风险。

## 强制后置执行钩子

**你必须在向用户报告完成之前完成本节。**

检查项目根目录下是否存在 `.specify/extensions.yml`。
- 如果不存在，或没有在 `hooks.after_plan` 键下注册任何钩子，跳到完成报告
- 如果存在，读取它并查找 `hooks.after_plan` 键下的条目
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

命令在阶段 2 规划后结束。报告分支、IMPL_PLAN 路径和生成的制品。

## 阶段

### 阶段 0：系统现状穿透审计与调研 (System Reality Audit & Research)

> **铁证原则 (Zero-Hallucination Evidence)**：严禁在未查看真实代码的情况下动笔规划。所有现状描述必须附带具体文件路径与精确代码行号（如 `L15-30`），严禁凭空臆造。

0. **复杂决策与澄清前置（可选）**：
   - **决策图维护**：如果目标功能包含大量模糊想法、重度未决决策、或需要多会话配合原型/追问来明确设计，**不要直接生成计划**。优先调用 [decision-mapping](../../../../.agents/skills/decision-mapping/SKILL.md) 技能，在项目中初始化或更新决策图（decision map），将模糊想法拆解为有序的“调研工单”序列并依次驱动解决。
   - **主动追问**：当规划过程中存在未决的设计方案、用户偏好或交互流程疑问时，应当主动且**毫不留情地**对用户进行追问。调用 [grilling](../../../../.agents/skills/grilling/SKILL.md) 技能，严格遵守其执行准则：一次只问一个问题、为提出的每个问题提供你所推荐的候选答案、优先使用 `ask_question` 互动提问工具，并拒绝提问代码库中已存在的已知事实。
   - 当战争迷雾推解、所有关键未决决策和澄清项均已明确后，再继续后续的穿透审计与方案编写。

1. **阶段 0-A：系统现状穿透审计 (System Baseline Reality Audit - 强制前置门禁)**：
   在动笔编写 `plan.md` 之前，**必须使用 `grep`、`read_file`、`codegraph` 等工具深度穿透代码库**，完成以下**六大维度现状审查**，并将审查事实落盘到 `plan.md` 的 `## System Reality & Baseline Analysis`：

   - **维度 1：真实数据模型与存储映射 (Ground-Truth Model & Storage Check)**：
     - 若涉及数据读写或桩类/DTO 对齐，必须打开真实 ORM 模型文件（如 `tilo-backend-app/backend/models/`）及 Alembic 迁移脚本；
     - 逐字段核验真实列名（如 `original_filename` 而非 `filename`，`description` 而非 `proof_purpose`）、实际数据类型、主外键关系；
     - 严格核查软删除语义（如是 `status == "deleted"` 枚举还是软删布尔列）；
     - 严格核查 naive CST 时间字段是否显式声明 `sa_type=DateTime(timezone=False)`，彻底杜绝隐式 UTCDateTime 崩溃。
   - **维度 2：既有构件复用与防重复对账 (Reuse Audit: Repositories / Services / Helpers)**：
     - 全仓检索是否已有现成 Repository 查询方法、Service 工具函数、数据导出助手、前端 Hook 等；
     - 坚决贯彻“优先复用已有成熟封装，严禁手写粗劣/语义冲突的重复实现”；
     - 记录已识别的可复用构件名称、定义文件路径（含精确行号）与复用策略。
   - **维度 3：调用拓扑与符号可达性穿透 (Call-site & Reachability Audit)**：
     - 对计划修改或收敛的类、函数、桩类或路由端点，执行全库 `grep` 检索其所有实际调用点；
     - 明确调用链路状态（活跃业务链路 vs 休眠适配层 vs 过渡残留死代码）；
     - 逐一清点所有同名变体或散落桩类（记录所在文件、精确行号、构造语义差异如 uuid4 自动生成），坚决杜绝漏网遗漏。
   - **维度 4：真实鉴权守卫、上下文与缓存链路 (Auth, Guards & Cache Flow)**：
     - 核查端点真实挂载的守卫依赖（如 `require_case_access`、`get_case_with_auth_fn`），核验其实际抛出的异常状态码（403 还是 404），严禁假设不存在的鉴权模型（如臆造协作者白名单）；
     - 检查上下文传递链路（Zero-DB 契约，校验在前、绑定在后）；
     - 核查缓存（Redis）：若涉及缓存，必须全仓排查该缓存键在哪些写路径上有明确的 delete/invalidate 逻辑，严禁在文档中虚指“已有机制自动失效”。
   - **维度 5：工程配置、语法规范与门禁水位 (Toolchain, Linter & Line-Count Constraints)**：
     - 检查计划修改文件的当前物理行数与圈复杂度，核实是否逼近门禁（后端 >600 行、前端组件 >500/700 行、Hook >350 行），若触碰则在方案中明确拆解策略；
     - 核查 `mypy.ini`、`ruff.toml` 对目标目录的现有配置（是否有既有错误码抑制、是否启用 ANN/RUF 规则等）。
   - **维度 6：存量测试基线与夹具现实 (Test Baseline & Fixtures Reality)**：
     - 检查目标模块关联的存量测试用例（`tests/`）；
     - 核验存量测试夹具（fixtures / mock 数据）是否缺少关键属性（防止新逻辑在存量用例中静默零覆盖）；
     - 识别并记录必须纳管的冒烟回归测试用例。

2. **阶段 0-B：技术选型与研究报告 (`research.md`)**：
   从技术上下文中提取未知项并分派研究代理，生成结构化文档保存至 `research.md`。`research.md` 必须包含两个明确部分：
   - **第一部分：系统现状代码静态穿透审计报告 (System Baseline Code Audit)**：
     汇总记录上述六大维度的穿透调研结果，包含真实文件路径、精确代码行号、grep 检索命令与统计结果。
   - **第二部分：技术选型决策与架构考量 (Technical Decisions & Options)**：
     使用以下标准格式记录各项技术决策：
     - 决策：[选择什么]
     - 理由：[为什么选择]
     - 考虑的替代方案：[还评估了什么]
     - 既有构件复用论证：[为什么复用已有构件或为什么现有构件无法满足]

**输出**：包含系统现状代码静态审计报告与所有技术决策已解决的 `research.md`

### 阶段 1：设计与契约 (Design & Contracts)

**先决条件：** 阶段 0-A 系统现状审计已完成，`research.md` 已生成

1. **从功能 spec 提取实体** → `data-model.md`：
   - 实体名称、字段、关系、验证规则、状态转换；
   - **严格基于真实 ORM 字段**：实体字段必须与阶段 0-A 审查的真实 ORM 模型严格对齐，严禁凭空发明字段；
   - **桩类/DTO 强制对齐表**：若设计涉及桩类、DTO 或中间表示（IR），**强制编写《与后端真实 ORM 字段对齐表》**（逐字段注明：字段名、后端 ORM 是否存在列、调用点是否传入、处置方式），严禁遗漏运行时在用字段；
   - **领域模型与统一语言对齐**：校验并对齐项目已有的统一语言（读取 `CONTEXT.md` 或 `CONTEXT-MAP.md`），若命名或术语冲突，主动提示并消除歧义；
   - 重大架构决策在 `docs/adr/` 下记录架构决策记录（ADR）。

2. **定义接口契约**（如果项目有外部接口） → `/contracts/`：
   - 识别项目向用户或其他系统暴露的接口；
   - 记录适合项目类型的契约格式（OpenAPI、SSE 流式事件枚举等）；
   - 严禁假定不存在的后端端点或前端接口。

3. **创建快速启动验证指南与日志排查规范** → `quickstart.md`：
   - 记录真实可运行的验证场景，证明功能端到端工作；
   - **必须纳管存量冒烟测试**：列出既存的冒烟测试用例命令（如 `tools/asr/tests/test_asr_imports.py`），确保重构不打破存量契约；
   - **记录环境日志检查路径与门禁**：
     - 后端: `backend/logs/{env}_{port}/error.log` (及全量 `backend.log`)
     - Nginx: `/var/log/nginx/error.log`
     - DB/容器: `docker logs law_db_dev` (PostgreSQL) / `docker logs law_minio`
     - 前端: 终端控制台与 DevTools Console
     - 异步 Task: `<appDataDir>/brain/<conversation-id>/.system_generated/logs/`
   - 明确在验证功能时**必须检查上述日志中的报错**，确认无未捕获异常和 500/502 错误。

4. **智能体上下文更新**：
   - 更新 `CLAUDE.md` 中 `<!-- SPECKIT START -->` 和 `<!-- SPECKIT END -->` 标记之间的计划引用，指向步骤 1 中创建的计划文件（IMPL_PLAN 路径）。

**输出**：data-model.md、/contracts/*、quickstart.md、更新后的智能体上下文文件

### 阶段 2：自动化防腐自检门禁 (Automated Pre-flight Audit Gate)

在向用户汇报规划完成之前，**必须执行自动化静态审计脚本进行自检**：
```bash
python3 .agents/skills/plan-review/scripts/plan_audit_guard.py <IMPL_PLAN> --format=markdown
```
**自检核查标准**：
1. **源码清单核查**：审计结果中「提及源码文件」不得为 0。必须在 `plan.md` 的 `## System Reality & Baseline Analysis` 中清晰以真实路径（如 `backend/...`、`tilo-core-engine/...` 或 `frontend-v2/...`）列出所有拟变动文件。
2. **门禁水位核查**：检查是否存在标记为 `FAIL`（超上限）或 `DANGER ≥90%`（濒临上限）的文件。若存在，必须在 `plan.md` 的架构决策与任务拆解中显式规划拆分解耦策略（如提取独立策略类或自定义 Hook），严禁在超限大文件内原地堆砌长逻辑。

## 关键规则

- **先查实情，再写方案**：严禁脱离代码库现状臆造方案。所有涉及数据模型、构件复用、调用点与鉴权逻辑必须附带真实代码行号。
- 文件系统操作使用绝对路径；文档和智能体上下文文件中的引用使用项目相对路径。
- 在关卡失败或未解决的澄清时报错。
- **必须记录并检查日志**：在规划验证指南与后续功能实现过程中，必须明确不同环境的本地日志存储位置，并强制检查 `backend/logs/{env}_{port}/error.log` 及 Nginx 日志，无报错后方可完成验证。

## 完成条件

- [ ] 阶段 0-A 系统现状穿透审计已执行，IMPL_PLAN 中的 `## System Reality & Baseline Analysis` 六大板块已完整填写（含真实文件与行号）
- [ ] 阶段 0-B 技术调研已完成，`research.md` 已生成（含系统现状静态审计报告与架构决策）
- [ ] 阶段 1 设计制品已生成：`data-model.md`（含 ORM 对齐表）、`contracts/`、`quickstart.md`（含存量冒烟测试与日志检查路径）
- [ ] 阶段 2 自动化防腐自检门禁（`plan_audit_guard.py`）已执行并通过（提及源码文件 > 0，超限文件具备拆分预案）
- [ ] 扩展钩子已根据上述强制后置执行钩子中的规则分发或跳过
- [ ] 完成报告已向用户呈现分支、计划路径、生成的制品与自动化审计结果
