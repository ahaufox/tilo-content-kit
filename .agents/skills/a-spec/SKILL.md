---
name: "a-spec"
description: "功能规格说明(spec.md)创建/更新。根据自然语言需求生成简洁、可验证的 spec.md。关键词：功能规格/Spec/需求文档/specification/user story。"
argument-hint: "描述你想要定义规格的功能"
compatibility: "需要 .specify/ 目录与 docs/00-7待办/（或子仓 docs/00-待办/）结构"
user-invocable: true
disable-model-invocation: false
---

# 功能规格创建与更新 (`/a-spec`)

仅产出单一 `spec.md`（目标 ≤ 80 行），**不生成** `checklists/requirements.md` 或多余附属文档。

## 输入

```text
$ARGUMENTS
```

若输入为空，提示用户提供功能描述后再继续。

## 执行步骤

1. **生成短名称与确定目录归属（模式 A）**：
   - **短名称**：提炼 2-4 个词（动作-名词，如 `batch-case-export`、`fix-payment-timeout`），保留技术缩写（OAuth2/API/JWT 等）。
   - **目标目录归属规范（SSOT）**：
     - 跨仓协同/全栈需求：主仓 `docs/00-7待办/04-混合/<NNN-主题>/`（若明确归属单一主仓分层可入 `01-前端` / `02-backend` / `03-core-backend`，未指定默认归入 `04-混合/`）；
     - 单子仓自治需求：`<subrepo>/docs/00-待办/<NNN-主题>/`；
     - 严禁散落于根目录、`docs/` 或其他非规范路径；若显式传入 `SPECIFY_FEATURE_DIRECTORY` 或更新已有专案，直接使用该路径。
   - **专案目录编号规范 (`NNN`)**：
     - 目录名前缀必须采用三位递增数字（例如 `132-xxx`）。
     - 计算规则：全局扫描主仓 `docs/00-7待办/`（四层子目录）与 `docs/00-7待办/已完成/`、以及各子仓 `<subrepo>/docs/00-待办/` 与 `已完成/` 下现存所有以三位数字开头的目录，取当前全局最大数字 `+ 1`（如现存最大为 131 时取 132；`>= 500` 段位专供外部 Issue/工单特例映射，不参与常规递增计算）。
     - 每次 `/a-spec` 仅创建一个功能，spec 目录名与 git 分支名彼此独立。
   - 创建专案目录并将实际相对路径持久化写入 `.specify/feature.json`：
     ```json
     {"feature_directory": "<实际相对路径>"}
     ```

2. **现状先查（防臆造）与调研**：
   - 若需求涉及现有页面、组件、接口或数据表，先用 `read_file` / `grep` / `codegraph` 核查真实源码与 `sqls/数据库表关系说明.md`。
   - 交互文案、状态枚举、字段名、入口位置必须与现有实现对齐，严禁凭直觉脑补。
   - 如需了解技术选型、法律规范或竞品做法，优先调用 `deep-research` 技能。

3. **必要澄清（最多 3 问）**：
   - 对非核心细节按行业惯例做合理默认，记入「边界与假设」。
   - 仅当存在显著影响范围、权限或用户体验且无合理默认值的歧义时，向用户集中提出 **最多 3 个问题**（排序优先级：范围 > 安全/隐私 > 用户体验 > 技术细节；优先使用 `ask_question` 或简洁选项表，附推荐项），待确认后继续。

4. **生成 `spec.md`**：
   - 套用 `.specify/templates/spec-template.md` 写入 `<专案目录>/spec.md`（目标 ≤ 80 行）。
   - **硬性精简原则**：
     - 聚焦“做什么 / 为什么 / 怎么验”，避免堆砌实现细节；
     - 每个核心场景写清 Given-When-Then（至少含 1 个正常路径和 1 个异常路径）；
     - 不适用的章节直接删除，不保留空模板或 `N/A` 占位。
   - 若 `.specify/extensions.yml` 存在且启用了 `after_specify` 钩子，按需提示下一步命令。

5. **完成汇报**：
   - 输出专案目录路径、`spec.md` 路径、核心范围/假设摘要（3-5 句以内），并提示下一步可运行 `/a-plan`。
