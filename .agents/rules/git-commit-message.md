---
trigger: always_on
---
> **Scope (Globs)**: `["*"]`

# Git 提交与用户评审门禁规范

## 1. 用户评审与提交门禁 (User Review Gate - 强制)

- **代码修改与版本提交严格解耦**：智能体完成代码修改、Lint/Typecheck 检查、单元测试及环境日志排查后，**严禁未经用户明确授权私自执行 `git commit` 或 `git push`**。
- **任务完成汇报与 Review 流程**：
  1. **呈报改动与凭据**：任务完成时，向用户清晰呈报本次变更的文件列表、核心逻辑修改说明以及真实的测试/检查命令输出凭据；
  2. **保留工作区并等待指示**：所有改动严格保留在本地工作区（未提交状态），静候用户 Review；**仅在用户明确给出提交指示（如“确认提交”、“执行commit”、“允许推送”等）或明确要求起草提交说明时，方可提供 Conventional Commits 提交信息并执行 Commit 与 Push**。日常答复严禁机械附带建议提交信息，杜绝信息噪点。

## 2. 提交信息规范 (Conventional Commits)

当用户明确确认提交后，提交信息严格遵循以下规范：

- **格式标准**：`<type>(<scope>): <中文描述>` 或 `<type>: <中文描述>`
- **强制中文**：描述必须使用中文撰写，简短概括，不超过 100 个字符。
- **Type 候选词**：
  - `feat`: 新功能
  - `fix`: 修补 Bug
  - `docs`: 文档变更
  - `style`: 代码格式调整（不影响业务逻辑）
  - `refactor`: 重构（既不修复 bug 也不添加特性的代码重构）
  - `perf`: 性能优化
  - `test`: 增加或修改测试
  - `chore`: 构建过程或辅助工具的变动
- **格式与特性分离**：自动化代码格式化变更必须使用 `style` 或 `chore`，**禁止**将其与 `feat` 或 `fix` 混合在同一个 Commit 中。

## 3. 推送目标 (Push Targets)

经用户确认执行 `git push` 时，必须确保推送到两个远端（GitHub + cnb.cool）：

- `origin` 配置了**两个 pushurl**（GitHub + cnb.cool），日常执行单条命令即可同时覆盖两端：
  ```bash
  git push origin <branch>
  ```

当前拓扑（`git remote -v`）：
- Fetch: GitHub (`git@github.com:ahaufox/law_tech.git`)
- Push #1: GitHub (`git@github.com:ahaufox/law_tech.git`)
- Push #2: cnb.cool (`https://cnb.cool/tilo-work/main_tech`)

注意：
- 推送后用 `git status` / `git log` 确认双远端均已同步。
- 若推送中途某个远端失败（pushurl 逐个尝试，不会自动回滚），必须修复后重推。

## 4. 相关技能 (Related Skills)

- **`infra-git-auto-suite`**：Git 自动化套件（commit→PR 全流程）。仅在用户明确确认提交或显式调用该技能时执行。
