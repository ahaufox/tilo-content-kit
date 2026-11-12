---
name: infra-git-auto-suite
description: Git 自动化套件（提交→PR 全流程） / Git Automation Suite (commit→PR pipeline)。通过单条指令完成从代码变更分析、智能分组分桶、独立验证到原子提交的全过程。默认强制分组提交（分桶提交）、独立门禁验证、严禁跨领域大杂烩提交。适用场景：保持提交历史清晰可追溯、原子化代码审查、按架构领域智能拆分提交、多端协同高质量交付。关键词：Git自动化/Git提交/分组提交/分桶提交/PR创建/代码审查/选择性提交/智能分类/原子提交/git auto/commit automation/PR/git add/git commit/code review automation/smart commit。
---

# Git 自动化套件 (git-auto-suite)

AI 完全自主负责：**分析变更 → 智能分组分桶 → 决策独立验证 → 编写标准提交 → 原子执行**。`execute.py` 负责 Git/CLI 执行并内置跨领域防呆守门，拦截违规的大杂烩提交。

---

## 核心原则：默认分组提交与原子化（强制）

> 依据项目长期记忆 `[2026-07-16]`：一次性提交跨领域的大量变更会导致 CI 反馈循环长、问题排查与定位极其困难、Code Review 成本高昂、且极易引发合并冲突。

### 0. 用户 Review 门禁 (Review Before Commit)
- **按需触发而非自动执行**：本套件仅在用户明确要求提交、创建 PR 或显式调用本技能时触发，**严禁在常规开发/修复任务结束时未经确认私自自动执行**。
- **提交前呈现方案**：执行提交前必须向用户展示变更分析、分组分桶计划与拟定的 Commit 描述，待用户确认后原子执行。
- **逐桶说明（强制）**：每个桶必须逐条给出 ① 桶编号与拟定 Commit Message；② 划分依据（领域归属、逻辑单元边界、依赖拓扑）；③ 包含文件清单（含删除/新增文件）；④ 该桶的独立验证命令。用户已明确授权「提交并推送」时，说明后即可继续执行，无需中断等待二次确认。
- **确定性优先、存疑后置**：先把能明确判断、门禁通过的桶一次性执行完（提交 + 推送），再把所有存疑项汇总成一份清单，在流程末尾统一向用户咨询；禁止在中途零散打断，禁止对存疑项自行取舍。

### 0.1 提交前远端同步铁律 (Sync Before Commit)
- **每次提交前拉取最新远程提交**：在开始执行任何 Bucket 提交之前，必须先拉取对应仓库远端的最新提交（`git pull --rebase --autostash`），确保本地分支基于最新基线进行提交，避免一次性提交全部导致冲突。
- **杜绝陈旧基线导致的分叉与冲突**：严禁在未拉取远端更新的情况下盲目在本地提交；执行器 `execute.py` 默认开启 `sync_before_commit: true`，在执行分桶前自动核对 upstream 并完成增量 rebase。
- **多仓拓扑协同提交流程（子仓优先 → 主仓对齐）**：
  1. **子仓前置同步与独立交付**：每个发生修改的子模块（如 `tilo-backend-app`, `frontend-v2`, `tilo-core-engine`）先进入子仓目录，拉取子仓远端最新提交（`git pull --rebase`），在子仓内独立执行验证、分桶提交并推送到远端；
  2. **主仓拉取对齐与指针收敛**：所有子仓推送成功后，回到主仓拉取主仓远端最新提交（`git pull --rebase`），分桶提交主仓特有的文档与基建文件，并在最后一个桶中原子更新子模块指针并推送到主仓双远端。确保子模块新 HEAD 永远先于主仓 gitlink 落地，杜绝悬空指针。

### 1. 默认分组提交铁律
- **默认必须分组提交（分桶提交）**：所有包含多领域、多模块或多职责的变更，必须严格拆分为相互独立的 bucket 依次验证和提交。
- **严禁跨领域大杂烩提交**：绝不允许一次提交包含大量跨领域变更！
- **仅在单一内聚时才允许单桶**：只有当本次工作区的全部变更**原本就严格局限在单一领域/单一职责内**（例如只改了某个后端 Service 及其单测，或仅更新了一篇文档）时，才自然形成单个 bucket。
- **功能完整才进入 Bucket**：未完成、有已知缺口或包含调试代码的文件留原地，不提交。

### 2. 跨领域混合禁令矩阵（红线）

| 禁令类型 | 说明 | 正确做法 |
|---------|------|----------|
| **前后端混排 🚫** | 严禁将后端代码与前端页面混入同一个 Commit | 拆分为 `backend` 桶与 `frontend` 桶分别提交 |
| **双前端混排 🚫** | 严禁将 `frontend-v2` 与 `admin-frontend` 混入同一个 Commit | 分别设立独立的客户端桶 |
| **代码与文档混排 🚫** | 严禁将业务代码与 `docs/`（如 00-7待办、规划文档）混入同一个 Commit | 业务代码提 `feat/fix`，规划文档独立提 `docs` 桶 |
| **数据结构与视图混排 🚫** | 严禁将 Alembic 迁移/数据模型与前端 UI 界面混入同一个 Commit | 数据库层先行提交 `feat(db)`，前端后行提交 |
| **重构/格式与新功能混排 🚫** | 严禁将自动化格式格式化 (`style`) 或架构重构 (`refactor`) 与业务特性混在同一个 Commit | 格式/重构单独建桶先提，业务逻辑后提 |
| **规则技能与业务混排 🚫** | 严禁将 `.agents/` 规则/技能配置与具体业务代码混入同一个 Commit | 规则技能独立提 `chore(agent)` 或 `feat(skill)` |

---

## 标准分桶领域体系 (Domain Taxonomy)

在分析变更时，按照以下领域层次进行正交归类与拆分：

```
[工作区变更]
   │
   ├── 1. 数据库与存储域 (DB)      ──→ feat(db) / fix(db) / refactor(db)
   ├── 2. 后端服务与路由域 (Backend) ──→ feat(backend) / fix(api) / test(backend)
   ├── 3. 用户端应用域 (Frontend-v2) ──→ feat(frontend) / fix(frontend) / style(frontend)
   ├── 4. 管理后台应用域 (Admin)    ──→ feat(admin) / fix(admin) / chore(admin)
   ├── 5. 规划与项目文档域 (Docs)    ──→ docs: 描述
   └── 6. 工程基建与规则域 (Infra)   ──→ chore(infra) / feat(skill) / ci: 描述
```

### 各领域分桶规范速查

| 领域分类 | 涵盖路径示例 | 推荐 Commit Message | 专属验证命令 (`verify_cmds`) |
|---------|-------------|---------------------|---------------------------|
| **1. 数据库层** | `tilo-backend-app/backend/models/`, `tilo-backend-app/backend/alembic/`, `tilo-backend-app/backend/repositories/`, `sqls/` | `feat(db): 新增用户账户统计关联字段` | `cd tilo-backend-app/backend && ruff check --no-cache <files>` |
| **2. 后端核心层** | `tilo-backend-app/backend/routers/`, `tilo-backend-app/backend/services/`, `tilo-core-engine/agents/`, `tilo-backend-app/backend/schemas/` | `feat(backend): 实现用户数据概览接口及统计服务` | `ruff check --no-cache <files>`<br>`cd tilo-backend-app/backend && ../../.venv/bin/pytest <test_files> -v` |
| **3. 前端客户端** | `frontend-v2/src/`, `frontend-v2/openapi.json` | `feat(frontend): 用户设置页新增统计卡片与指标网格` | `cd frontend-v2 && pnpm lint`<br>`cd frontend-v2 && pnpm test -- --run <test_files>` |
| **4. 管理后台** | `admin-frontend/src/`, `admin-frontend/config/oneapi.json` | `feat(admin): 案件管理详情同步最新字段契约` | `cd admin-frontend && pnpm lint` |
| **5. 文档与待办** | `docs/00-7待办/`, `docs/02-规划/`, `*.md` | `docs: 更新 CNB 未关闭 Issue 处理进度与阶段清单` | 检查 Markdown 链接与排版格式 |
| **6. 基建与技能** | `.agents/`, `scripts/`, `dev-ops/`, `.github/` | `feat(skill): infra-git-auto-suite 升级为默认分组提交` | 运行对应脚本自测 |

> **提示**：当某个核心功能的后端接口修改并伴随配套的单元测试时，该单测属于同领域文件，**应当**与该模块代码放在同一 bucket（例如 `tilo-backend-app/backend/routers/foo.py` 与 `tilo-backend-app/backend/tests/test_foo.py` 同属后端桶）。但严禁将前端测试或文档塞入后端桶！

---

## 精简执行流程（3 步）

### 第 1 步：预检（检测环境）

```bash
python3 .agents/skills/infra-git-auto-suite/execute.py --preflight
```

返回 `python_cmd` / `has_venv` / `has_pytest`，据此决定后续 Python 验证命令的解释器绝对路径。

### 第 2 步：变更分析与分组分桶

```bash
# 查看全量状态与概览
git status --porcelain && echo '---' && git diff --cached --stat && git diff --stat
```

**分组决策逻辑**：
1. **识别所有变动文件的领域归属**（对照上述 Domain Taxonomy）。
2. **将互斥领域的变更严格拆分成不同的 Bucket**（严禁将 backend、frontend、docs 等混入单桶）。
3. **确定提交先后次序（依赖拓扑）**：
   - 依赖底层先行（如 DB 迁移/模型 → 后端服务/API → 前端客户端 → 待办/文档更新）。
4. **为每个 Bucket 分配独立的验证命令与规范 Commit Message**。

### 第 3 步：组装并执行分组提交

把规划好的 buckets 构造成 JSON 载荷。载荷格式严格遵守本技能目录下的模式定义文件：**[input.schema.json](input.schema.json)**。

#### 方案 A：通过 JSON 文件传参（强烈推荐，杜绝引号转义与换行解析异常）

```bash
cat << 'EOF' > /tmp/git_commit_plan.json
{
  "buckets": [
    {
      "files": [
        "tilo-backend-app/backend/schemas/system/user.py",
        "tilo-backend-app/backend/repositories/case/core.py",
        "tilo-backend-app/backend/routers/users/profile.py",
        "tilo-backend-app/backend/tests/test_user_profile_stats.py"
      ],
      "verify_cmds": [
        "ruff check --no-cache tilo-backend-app/backend/schemas/system/user.py tilo-backend-app/backend/routers/users/profile.py",
        "cd tilo-backend-app/backend && ../../.venv/bin/pytest tests/test_user_profile_stats.py -v"
      ],
      "commit_message": "feat(backend): 增加用户账户统计模型与详情查询接口"
    },
    {
      "files": [
        "frontend-v2/src/app/(main)/settings/components/AccountStatsGrid.tsx",
        "frontend-v2/src/app/(main)/settings/hooks/useSettingsProfile.ts",
        "frontend-v2/src/app/(main)/settings/components/__tests__/AccountStatsGrid.test.tsx"
      ],
      "verify_cmds": [
        "cd frontend-v2 && pnpm test -- --run src/app/\\(main\\)/settings/components/__tests__/AccountStatsGrid.test.tsx"
      ],
      "commit_message": "feat(frontend): 个人设置页面接入用户账户统计指标展示"
    },
    {
      "files": [
        "docs/00-7待办/04-混合/待处理-CNB未关闭Issue全量处理先后计划-2026-09-02.md"
      ],
      "verify_cmds": [],
      "commit_message": "docs: 更新账户统计接口开发完成待办状态"
    }
  ],
  "push": false
}
EOF

python3 .agents/skills/infra-git-auto-suite/execute.py --input /tmp/git_commit_plan.json
```

#### 方案 B：直接行内传入 JSON 字符串

```bash
python3 .agents/skills/infra-git-auto-suite/execute.py --input '{"buckets": [...], "push": false}'
```

---

## 输入载荷规范契约 (JSON Schema)

执行器校验与输入结构完全定义在 **[input.schema.json](input.schema.json)** 中。结构要素一览：

| 字段路径 | 类型 | 必填 | 默认值 | 作用与约束说明 |
|---------|------|------|--------|---------------|
| `buckets` | `Array<Object>` | **是** | - | 待提交的原子分组列表（至少 1 项）。依次独立运行 `git add` → `verify_cmds` → `git commit`。 |
| `buckets[].files` | `Array<string>` | **是** | - | 属于同一内聚领域的文件相对路径（相对于 repo 根目录）。严禁在同一桶内混排跨领域文件！ |
| `buckets[].commit_message` | `string` | **是** | - | Conventional Commits 中文提交信息，如 `feat(backend): 描述`。字数限制 5~150 字符。 |
| `buckets[].verify_cmds` | `Array<string>` | 否 | `[]` | 独立门禁验证 Shell 命令列表。按序全部返回 0 方可 commit；任一失败自动回滚暂存区。 |
| `buckets[].allow_mixed` | `boolean` | 否 | `false` | 是否豁免跨领域检查。除极少数特殊强耦合重大重构外，严禁开启。 |
| `push` | `boolean` | 否 | `false` | 全部 Bucket 提交成功后是否自动执行 `git push`（推向双远端）。 |

---

## 执行器跨领域防呆守门 (Cross-Domain Guardrail)

`execute.py` 内部集成了硬性拦截机制：
- **前置安全扫描**：在执行任何 `git add` 之前，执行器会静态审查每个 Bucket 的文件清单。
- **跨领域拦截**：若发现同一个 Bucket 混合了前后端、生产代码与文档规划等互斥领域，脚本会直接报错并终止，提示拆分 Bucket。
- **独立回滚机制**：每个 Bucket 依次进行 `add → verify → commit`。若某中间 Bucket 验证失败，仅自动回滚该 Bucket 的暂存，不会污染工作区，也不影响前面已经提交成功的 Bucket。

---

## 命令行参数详解 (`execute.py --help`)

随时可运行 `python3 <skill_dir>/execute.py --help`（或直接无参运行）查阅完整帮助与实战用例。核心选项：

- `--input <path|json>`: **输入载荷**。支持：① 本地 JSON 文件路径（如 `plan.json` 或 `@plan.json`，推荐）；② 直接 JSON 字符串。格式遵循 `input.schema.json`。
- `--preflight`: **环境预检模式**。快速探测并输出当前运行环境的 Python 解释器绝对路径、虚拟环境及 pytest 就绪状态（JSON 格式），不做网络操作。
- `--repo <dir>`: **Git 仓库根目录**。支持指定主仓库或特定子模块目录（默认当前目录 `.`）。
- `--report <path>`: **报告输出路径**。结构化输出提交 SHA、验证结果等运行日志（默认 `./git-auto-suite-report.json`）。
- **push 策略**：
  - 默认 `push: false`。
  - 仅当明确指定 `push: true` 且存在成功提交时执行推送；若当前分支是受保护分支（`main`/`master`/`develop`），必须额外显式设置 `push_to_protected: true`（等同记录用户明确授权），否则拒绝推送。
  - 只执行普通 `git push`，严禁 `--force` / `--force-with-lease` 强推。
  - 推送前用 `git ls-remote` 核对所有 push url（GitHub + CNB 双远端）的 ref，确认无分叉；推送遵循双远端规范。

---

## 冲突处理、执行顺序与 PR

### 默认策略：尽量保留双方改动（合并两者）
- **预检**：`git fetch` 后用 `git rev-list --left-right --count` 与 `git ls-remote` 检查本地及各 push url 是否分叉；用 `git diff --diff-filter=U` 确认无遗留未合并条目，再开始提交。
- **分叉处置**：优先 `git pull --rebase`（或 `git merge --no-ff`），逐个冲突文件做语义合并，**同时保留本地与远端的新增/修改内容**（双方新增段落并存、按语义去重），不得整块丢弃任一方。
- **禁止**：`-X ours` / `-X theirs` 整块取舍、`git checkout --ours|--theirs` 丢弃一方、`git push --force`、删除来源不明的改动。
- **合并后复验**：冲突解决后必须重跑受影响桶的 `verify_cmds`，通过后再推送。

### 存疑项登记（不臆断）
出现以下任一情形即判定为存疑：同一段落双方语义互斥改写、数据契约/结构不一致、无法判断哪一方为准、来源不明的改动、验证失败且原因不明确。
1. 记录：文件路径、双方内容摘要、疑点、候选处置方案；
2. 不自动解决、不擅自取舍，保留工作区原状；
3. 从本轮执行计划中摘出该桶，其余确定性桶照常提交并推送；
4. 在流程末尾把所有存疑项汇总成一份清单统一咨询用户，待答复后再处理。

### 子模块拓扑 (Git Submodule)
- 先在子模块仓内用 `--repo <submodule>` 分桶提交并推送，再回主仓单独建立 `chore(submodule): ...` 桶回写 gitlink。
- 子模块指针桶必须排在主仓所有桶之后；`-dirty` 标记需等子模块工作区干净后再回写。
- 主仓与子模块分别 fetch 并核对远端，避免子模块新 HEAD 未推送就被主仓引用。

### 完成后汇报
- 逐桶给出 Commit SHA、提交信息与验证结果；列出推送结果（含双远端）、跳过/存疑项清单与待用户确认事项。

---

## 相关技能与规则

- **`git-commit-message`**：提交信息中文规范与双远端推送要求。
- **`global-standards`**：全栈通用准则（严禁大杂烩提交、关注点分离）。
- **`code-review`**：提交前配合 SSLM（安全/标准/逻辑/可维护性）审查代码质量。
- **`testing-tdd-skills-standards`**：定向单测与环境解释器路径要求。
