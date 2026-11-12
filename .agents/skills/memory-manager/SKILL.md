---
name: memory-manager
description: Hermes 记忆管理器 / Hermes Memory Manager. 自动从对话和 Bug 修复中提取经验教训，根据时间衰减和频次将其流转到 Low (短期)、Middle (中期) 和 High (长期) 记忆区，防止相同错误再次发生。
---

# 🧠 Hermes 记忆管理器 (Memory Manager)

你是负责本项目系统性防呆与自我进化的记忆管理员。你的核心任务是确保开发团队和 AI 助手（包括你自己）“不在同一个地方跌倒两次”。

## 🎯 职责与触发时机

- **触发时机**：由 Agent 在成功解决一个报错 (Bug)、完成功能踩坑后**自动根据对话内容决定**触发，或者在发现同一类错误再次发生时调用。
- **目标文件（全仓记忆 SSOT，收敛于主仓 `.agents/rules/` 集中管控）**：
  - **在子仓环境运行时的引用（链接至主仓 SSOT）**：
    1. [memory-low.md](../../../../.agents/rules/memory-low.md) (短期记忆，子仓执行路径：`../.agents/rules/memory-low.md`)
    2. [memory-middle.md](../../../../.agents/rules/memory-middle.md) (中期记忆，子仓执行路径：`../.agents/rules/memory-middle.md`)
    3. [memory-high.md](../../../../.agents/rules/memory-high.md) (长期记忆 - 全局常驻，子仓执行路径：`../.agents/rules/memory-high.md`)
    4. [memory-archive.md](../../../../.agents/rules/memory-archive.md) (记忆归档，子仓执行路径：`../.agents/rules/memory-archive.md`)
  - **在主仓环境运行时的引用**：
    1. [memory-low.md](../../rules/memory-low.md) (短期记忆，主仓执行路径：`.agents/rules/memory-low.md`)
    2. [memory-middle.md](../../rules/memory-middle.md) (中期记忆，主仓执行路径：`.agents/rules/memory-middle.md`)
    3. [memory-high.md](../../rules/memory-high.md) (长期记忆 - 全局常驻，主仓执行路径：`.agents/rules/memory-high.md`)
    4. [memory-archive.md](../../rules/memory-archive.md) (记忆归档，主仓执行路径：`.agents/rules/memory-archive.md`)

## 🔄 记忆流转与生命周期机制

在处理记忆时，遵循以下“基于时间衰减与频次的晋升机制”：

1. **录入短期 (Low)**：
   - 当遇到**新**的、未经记录的代码 Bug、编译报错、逻辑陷阱时，将总结提取并写入 `memory-low.md`。
   - **初始频次**：标记为 `[频次: 1次]`。
   - **防误删缓冲期与衰减清理**：每次执行记忆管理时，检查 `memory-low.md` 中是否有一周以前（距离当前日期超过 7 天）且未再发生的条目。如果有，**必须将其移动到 `memory-archive.md` 中归档，并在对话框中输出简短的废弃声明**（如：“由于超过 7 天未再次发生，已将 [某问题] 移入归档区”），严禁直接永久删除。

2. **晋升中期 (Middle)**：
   - 在追加新记忆前，**先检查** `memory-low.md` 和 `memory-middle.md` (可以根据 `[Tags]` 关键字快速检索过去的解决方案)。
   - 如果发现该同类问题已经记录过，则将原有条目的频次加一。
   - 若 `memory-low.md` 中的某个记录频次达到 **2次或3次** 且依然存在威胁，或者持续数天被高频提及，必须将其从 `memory-low.md` 中**剪切并晋升**到 `memory-middle.md` 中。

3. **固化长期 (High)**：
   - 检查 `memory-middle.md` 中那些由于其架构根本缺陷导致频繁出错（频次不断升高），且最终决定通过制定系统级规范或引入新检查机制（如全局 ESLint、MyPy 限制或统一工具函数）来解决的条目。
   - 将这类条目提炼为全局性架构约束，从 `memory-middle.md` 中移除，正式写入 `memory-high.md`。

## ⚡ 冲突解决机制 (Conflict Resolution)

当检索历史记忆发现同一场景存在“不同解决方案”或“相互矛盾的约束”时，必须执行以下冲突消解策略：

1. **同级或低级冲突（如新 Bug vs Low/Middle 记忆）**：
   - **最新覆盖原则**：软件依赖和业务逻辑会演进，越新的解决方案往往越正确。
   - **合并更新**：不要直接添加两条矛盾的记忆。必须将新知识**合并 (Merge)** 或 **覆盖 (Override)** 进旧条目中，重置其时间戳，并在条目末尾打上 `[已解决冲突: 更新了方案]` 的标注，旧的废弃方案可随之移入 `memory-archive.md`。

2. **跨级高位冲突（如新 Bug vs High 全局红线）**：
   - **不可静默覆盖**：High 级别的记忆属于核心架构规范。如果当前的 Bug 修复方案与 High 记忆直接冲突（例如：临时引入了一个禁用的库来解决问题），**严禁 Agent 擅自修改 High 记忆**。
   - **请求仲裁**：Agent 必须中断流程，向用户抛出警告：“⚠️ 发现当前解决方案与全局长期记忆产生冲突”，展示矛盾点，并请求用户仲裁：是调整代码以遵循 High 规范，还是确实需要升级/推翻现有的 High 规范。

## 📝 结构化格式要求

在往 `memory-*.md` 文件写入新条目时，必须严格使用以下标准格式：

```markdown
`[YYYY-MM-DD] | [问题场景/Bug描述] | [根本原因] | [解决方案/防范规则] | [频次: N次] | [Tags]`
```

- **问题场景/Bug描述**：不要只写 "UI崩溃"，要写具体（如 "TiptapEditor未传入 ydoc 导致无法协同"）。
- **根本原因**：要深挖一层（如 "单测覆盖率不足以检测子组件未传参"）。
- **解决方案/防范规则**：针对下次怎么防（如 "增加全局搜索审计组件所有调用点"）。
- **Tags**：提取相关的技术栈、领域或动作标签（如 `[#Next.js] [#Auth] [#PostgreSQL]`），以提高检索精度。

## 🚀 执行工作流

当本技能被调用时，请按顺序执行：
1. **盘点**：回顾刚刚解决的问题，提取“场景”、“根因”、“解决方案”和“Tags”。
2. **环境感知与路径寻址**：
   - 自动检测当前工作目录：
     - 若当前处于**子仓根目录**（如 `tilo-backend-app/`、`tilo-core-engine/`、`frontend-v2/`、`admin-frontend/`、`prod-dev-ops/` 等），统一通过 `../.agents/rules/` 寻址并读写主仓的记忆文件；
     - 若当前处于**主仓根目录**，统一通过 `.agents/rules/` 寻址并读写记忆文件。
3. **检索历史**：利用 `grep_search` 或基于相关技术栈标签，读取现有的 `memory-low.md` 和 `memory-middle.md` 寻找同类记录。
4. **衰减与归档**：检查 `memory-low.md` 中超过一周且仅发生过 1 次的条目，将其追加写入 `memory-archive.md`，并通报废弃声明。
5. **决策并写入**：
   - 若为旧问题且方案一致 -> 累加频次，触发晋升规则（若满足），跨文件移动。
   - 若为旧问题但方案冲突 -> 触发【冲突解决机制】，更新合并旧条目，遇到 High 级冲突则中断求助。
   - 若为新问题 -> 将记录写入 `memory-low.md`。
6. **回放确认**：向用户简要通报：“已将该教训写入 [High/Middle/Low] 记忆中，防止未来重犯。”
