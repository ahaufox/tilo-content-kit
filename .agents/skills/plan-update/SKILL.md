---
name: plan-update
description: "读取 plan-review 审查报告并核实问题真伪，根据执行状态双轨推进：计划未执行时修正方案与任务文档(plan.md/tasks.md/spec.md)，计划已执行时直接进行代码修复与测试验证，输出核实与处置对账表并同步核销审查报告。当用户输入 /plan-update、要求'方案调整'、'计划更新'、'核实审查报告'或'整改方案'时触发。"
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - AskUserQuestion
  - Write
  - Edit
triggers:
  - /plan-update
  - plan-update
  - 方案调整
  - 计划更新
  - 方案更新
  - 核实审查报告
  - 整改方案
  - plan-review问题整改
---

# 方案调整与缺陷修复专家 (Plan & Remediation Specialist)

本技能作为 `plan-review` 的闭环执行器，负责读取审查报告（`plan-review.md`），基于真实代码与文档基线核验各问题的真实存在性。若问题属实，依据专案执行状态双轨推进：**计划未执行时调整方案与任务文档**，**计划已执行时直接实施代码修复与验证**，最终更新审查报告核销状态并呈报对账总结。

---

## 何时调用此技能

| 场景 | 用户指令示例 | 处理策略 |
|:---|:---|:---|
| **常规指令触发** | `/plan-update <路径/编号>` | 读取审查报告，自动识别问题，核实真伪并针对性整改 |
| **显式路径核查整改** | `读取 .../plan-review.md，核实问题是否存在。若存在则调整方案，已执行则修复代码` | 按指定路径加载审查报告，执行五阶段核查与修复管线 |
| **规划阶段方案修订** | `方案审查提了几个警告，帮我把 plan.md 和 tasks.md 修订对齐` | 聚焦方案与任务文档修正，消除计划设计疏漏 |
| **落地阶段代码自愈** | `二审发现实现漏掉了状态机保护和测试用例，按审查建议修复代码` | 直接修复源码文件，运行增量测试与静态检查，并对齐文档 |

---

## 使用示例

### 示例 1：指定路径一键核查整改
```text
/plan-update frontend-v2/docs/00-待办/173-ai-message-hierarchy-and-capsule-refinement/plan-review.md
```

### 示例 2：传入专案编号
```text
/plan-update 173
```

### 示例 3：自然语言指令
```text
读取 frontend-v2/docs/00-待办/173-ai-message-hierarchy-and-capsule-refinement/plan-review.md，核实其中说明的问题是否存在。如果存在，则进行方案调整，如果计划已经执行，则进行代码修复。
```

---

## 核心执行原则

1. **事实核实先行 (Zero-Hallucination Verification)**：
   严禁未检查真实文件即假设问题存在或已解决。所有判定必须核对代码库基线中的具体文件与行号。
2. **状态双轨分流 (Dual-Track Remediation)**：
   - **未执行 / 规划阶段**：针对方案文档（`plan.md`、`tasks.md`、`quickstart.md`、`spec.md`）进行修订，消除设计与计划疏漏；
   - **已执行 / 落地阶段**：直接对源码进行代码修复，并同步修订方案文档，确保代码实现与设计契约 100% 保持一致（SSOT）。
3. **验证与自愈闭环 (Quality Gate & Self-Healing)**：
   触碰代码后，必须运行增量静态检查（lint / typecheck）、单元测试及环境错误日志排查，遇阻断在当前回合就地排查自愈。
4. **用户评审与提交门禁 (Strict Review Gate)**：
   整改完成后，所有变更严格保留在本地工作区（未提交状态），呈报核验对账表，**严禁未经用户明确授权私自执行 `git commit` 或 `git push`**。日常答复不主动输出建议 Commit 信息，仅在用户要求起草或发出提交指令时提供。

---

## 核心流程

```
[Phase 1: 报告解析与定位]
   ↓
[Phase 2: 真实基线核实 (Zero-Hallucination)]
   ↓
[Phase 3: 状态诊断与双轨整改]
   ├── 规划阶段 / 文档疏漏 ──→ 调整 plan.md / tasks.md / quickstart.md
   └── 落地阶段 / 真实缺陷 ──→ 修复源码文件 + 增量运行测试/Lint + 同步方案
   ↓
[Phase 4: 质量门禁与自愈检查]
   ↓
[Phase 5: 报告状态核销与用户对账呈报]
```

### 阶段一：目标定位与报告解析 (Discovery & Parsing)

1. **目标定位**：
   - **显式路径**：用户提供绝对路径或相对路径（如 `frontend-v2/docs/00-待办/173-.../plan-review.md`）；
   - **编号/名称**：用户提供数字编号（如 `173`）或专案目录名，在 `docs/00-7待办/`、`frontend-v2/docs/00-待办/`、`tilo-backend-app/backend/docs/00-待办/` 中匹配目标专案；
   - **上下文自适应**：未传参时，从当前对话上下文、最近打开的文件或待办目录中自动发现待处理的 `plan-review.md`。
2. **结构化提取**：
   运行解析辅助脚本提取结构化清单：
   ```bash
   .venv/bin/python .agents/skills/plan-update/scripts/plan_review_helper.py parse <目标plan-review.md>
   ```
   识别报告中的专案目标、当前审核结论、核销概况以及全部问题条目（编号、级别、标题、证据引用、调整建议）。
3. **关联文档定位**：
   同步识别同目录下的核心专案资产：
   - `plan.md`（实施方案）
   - `tasks.md`（任务清单）
   - `quickstart.md`（快速验证与验收指引）
   - `spec.md`（需求规格）
   - `research.md`（前置调研与上下文）

---

### 阶段二：基线核查与定性 (Fact-Checking against Codebase)

1. **自动初步探测**：
   运行辅助脚本快速校验证据引用的路径存在性与行内容快照：
   ```bash
   .venv/bin/python .agents/skills/plan-update/scripts/plan_review_helper.py verify <目标plan-review.md>
   ```
2. **逐项实态判定**：
   针对每一项问题，打开实际文件比对上下文，给出客观定性：
   - `CONFIRMED (真实存在)`：证据所述缺陷客观存在（如文件行数超限原地堆砌、遗漏测试、死链、缺少防御机制）；
   - `ALREADY_RESOLVED (已解决)`：最近的提交或文档更新已修复该问题（如链接已改为有效目标、测试已补齐）；
   - `EXEMPT / NOT_APPLICABLE (豁免 / 环境不适用)`：审查误报、被新方案自然替代、或环境差异（如 macOS 本机环境未运行 Linux Nginx 代理日志）。必须记录充分事实依据。

---

### 阶段三：执行状态诊断与针对性整改 (Diagnosis & Remediation)

根据当前专案的执行进展进行分流处置：
- **执行状态判断**：
  - 检查 `tasks.md` 中任务是否已打勾 `[x]`；
  - 检查方案所涉及的目标源码文件是否存在并已有落地实现。

#### 分支 A：方案与计划调整（未执行 / 规划阶段 / 纯文档疏漏）
针对 `CONFIRMED` 的文档与计划问题：
1. **更新 `plan.md`**：修正技术路线、修复失效链接、对齐行数基线快照、补足架构契约与设计边界；
2. **更新 `tasks.md`**：补全遗漏的执行任务（例如将缺失的专项回归测试命令、日志排查门禁补充为明确的 `Txxx` 任务项，调整前后置依赖）；
3. **更新 `quickstart.md` / `spec.md`**：补全测试验证命令、参数及验收门槛。

#### 分支 B：代码修复与实现闭环（已执行 / 落地阶段 / 真实代码缺陷）
针对已落地的代码缺陷（如超限文件堆砌、状态机未结算、缺少边界兜底、测试失败等）：
1. **代码修改**：
   - 遵循项目核心规范（薄组件、状态机防御、Google Style Docstrings、中文注释、类型契约）；
   - 遵循架构防腐红线：单函数 ≤150 行，UI 面板 ≤700 行，业务服务 ≤600 行，避免原地无限堆叠 `if-else`；
   - 严禁引入二次缺陷。
2. **文档同步对齐**：
   代码修复后，同步更新对应的 `plan.md` 与 `tasks.md`，使方案陈述与真实代码基线完全对齐。

---

### 阶段四：验证自愈与质量门禁 (Verification Gate)

若实施了代码修复或环境测试：
1. **增量静态检查与测试**（按所属子工程执行）：
   - **前端 Next.js** (`frontend-v2/`)：
     ```bash
     cd frontend-v2 && pnpm vitest run <涉及测试用例>
     pnpm typecheck
     ```
   - **后端 FastAPI** (`tilo-backend-app/backend/`)：
     ```bash
     cd tilo-backend-app/backend && ruff check <修改文件>
     ../../.venv/bin/mypy <修改文件> --config-file mypy.ini
     ../../.venv/bin/pytest <测试用例> -v
     ```
2. **检查环境日志**：
   - 确认 `backend/logs/.../error.log` 无未捕获异常或 500/502 错误。
3. **遇错自愈**：
   若检查未通过，立即在当前回合分析原因并就地修复，直至退出码为 0。

---

### 阶段五：审查报告核销与对账输出 (Reconciliation & Reporting)

1. **回写 `plan-review.md`**：
   - 更新各问题条目的状态标：
     - `[❌ 未整改]` → `[✅ 已整改-代码修复]`
     - `[❌ 未整改]` → `[✅ 已整改-方案调整]`
     - `[❌ 未整改]` → `[⚪ 豁免-环境不适用]`（或误报）
   - 在问题条目下方追加 `- 处置结果: ...`，简要说明采取的修改动作与生效文件；
   - 更新报告顶部的 `结论:` 与 `核销:` 汇总（如「结论: 全部整改完成，核销闭环」）。
2. **向用户输出结构化对账表**：
   详见下文「输出产物」。
3. **保留工作区**：
   所有改动保留在本地，静候用户 Review；**严禁私自执行 `git commit` 或 `git push`**。

---

## 输出产物

1. **已修订的方案/设计文档**：
   - 调整后的 `plan.md`、`tasks.md`、`quickstart.md` 或 `spec.md`。
2. **已修复的代码文件**（若涉及代码缺陷）：
   - 包含修复后通过验证的源码。
3. **已核销更新的审查报告**：
   - 更新了状态标记与处置结果的 `plan-review.md`。
4. **对话回复中的对账总结报告**：
   ```markdown
   ## plan-update 整改对账报告

   | 编号 | 严重度 | 核实判定 | 处置方式 | 涉及文件 | 验证凭据 |
   |:---|:---:|:---:|:---:|:---|:---|
   | 1 | 🟡警告 | CONFIRMED | 方案调整 | quickstart.md, tasks.md | 门禁规范补齐 |
   | 2 | 🟡警告 | CONFIRMED | 代码修复 | ToolCallPart.test.tsx | Vitest 4/4 通过 (exit 0) |
   | 3 | 🟢建议 | ALREADY_RESOLVED | 无需修改 | plan.md | 链接已修正为 spec.md |

   ### 变更说明摘要
   - [分点陈述关键修改]


   ```
