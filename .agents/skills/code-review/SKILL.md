---
name: code-review
description: "全栈代码审查 + 安全专项扫描 / Full-stack Code Review (SSLM) + Security Guard。基于 SSLM(Security/Standards/Logic/Maintainability)四维框架，内置安全专项加强模式可深度检测密钥泄露(API Key/Token/密码)、SQL注入、命令注入、路径遍历、越权访问(IDOR/RBAC突破)、敏感信息硬编码等安全问题。适用场景：提交代码前安全/规范/逻辑/可维护性全面审查、CI 代码质量门禁、PR 审查、密钥泄露扫描、API 权限校验审计。关键词：代码审查/Code Review/SSLM/安全审计/密钥检测/SQL注入/越权/PR审查/安全扫描/security review/code injection/IDOR/secret detection/vulnerability scan/best practices/code quality。"
---

# code-review 技能规范

## 核心约束与执行标准

### 严格边界与禁止项

1. **严格禁止**在未经验证的情况下删除核心业务逻辑或约束。
2. **严格禁止**输出与该技能目标无关的代码。
3. **必须**保证输出内容符合系统设定的高可用与安全性标准。

## 何时使用
- **待办专案与方案架构深度同行评审**（在动手编码实施前进行架构防腐、契约核验与准入把关）。
- **代码提交前**（如 Git 自动化提交流程触发）。
- **合并请求（PR）审查**。
- **复杂功能模块开发或重构完成后的质量验收**。

## 审查模式双轨分流与执行规范

执行本技能时，首先根据审查对象判定并分流进入对应的审查模式：

### 模式 A：待办专案与方案规划深度审查 (Plan & Architecture Review Mode)

当审查对象为**待办专案目录**（如 `docs/00-7待办/<分层>/<专案编号>/`）或**系统设计方案**（含 spec.md / plan.md / tasks.md / research.md 等）时，自动激活本模式。

#### 核心强制铁律：每次评审必须生成版本化底稿 `plan-review-{x}.md`
1. **严禁口头流转与临时对话输出**：针对方案的审查结论与详细剖析，**必须使用文件写入工具持久化落盘至该专案目录下的 `plan-review-{x}.md` 文件中**（如初审必须生成 `plan-review-1.0.md`；若已存在则顺延递增，如二审生成 `plan-review-1.1.md` 或 `plan-review-2.0.md`），作为后续修订与对账核销的 SSOT 底稿。
2. **真实代码基线实测（铁证防幻觉）**：审查过程中严禁纸上谈兵，必须实测涉及源码的真实行数、现有路由状态、环境变量、数据库/ORM 导入与配置，表格化列出方案陈述 vs 实测结果。
3. **六维量化评估雷达**：
   - 维度 1：契约与规范完整性 (Standards & Contracts, 满分 10)
   - 维度 2：安全与健壮性 (Security & Safety, 满分 10)
   - 维度 3：技术可行性与架构防腐 (Architecture & Anti-Corruption, 满分 10)
   - 维度 4：实现逻辑与状态机 (Logic & State Machine, 满分 10)
   - 维度 5：用户体验与可维护性 (Maintainability & UX, 满分 10)
   - 维度 6：落地操作性与验证闭环 (Operability & Verification, 满分 10)
   - **准入判定准则**：
     - **APPROVED (≥52分)**：准入实施，按计划进入编码阶段。
     - **CONDITIONAL APPROVED (40~51分)**：条件准入，必须先按报告修复阻断项并更新文档后再启动开发。
     - **REJECTED (<40分 或 存在一票否决级架构漏洞)**：打回全面修订，严禁进入编码。
4. **待办任务清单 (tasks.md) 修订对照指导**：逐条指出 tasks.md 中需增补、修正或调整依赖顺序的具体任务。
5. **元数据关联反哺**：生成评审报告后，在专案 `plan.md`、`tasks.md` 头部关联该评审底稿超链接。

---

### 模式 B：代码实现与变更差异审查 (Code & Diff Implementation Review Mode)

当审查对象为**具体代码文件、Git 暂存区/分支 diff、PR 代码**时，激活本模式。

#### 1. 本地静态检查（替代远程 CI）
- **变更优先**：只对变更文件执行静态检查（增量优先），不改全局配置时不必跑全量。
- **后端**: `ruff check <变更py文件>` + `mypy <变更py文件> --config-file mypy.ini`；涉及模型/核心共享文件时跑全量 `ruff check backend` / `mypy backend --config-file mypy.ini`。
- **前端**: `npm run lint` + `npm run build`（frontend-v2 / admin-frontend）。
- **负向约束**: **严禁在静态检查失败或未执行的情况下判定审查通过。**

#### 2. SSLM 四维审查框架
在本地静态检查通过的基础上，依次进行以下四维深度审查：
- **S1 (安全与健壮 Security & Safety)**: 检查敏感信息硬编码、SQL 注入风险、写操作鉴权注入 (`current_user`)、资源复用及完整异常捕获。
- **S2 (规范与契约 Standards & Contracts)**: 检查 RESTful 路径规范（严禁动词）、`UnifiedResponse` 响应封装、Alembic 数据库迁移规范及前后台 Design Token 引用规范。
- **L (逻辑与正确性 Logic & Correctness)**: 检查业务边界条件、软删除过滤、事务回滚一致性、Python 异步并发安全及前端深层数据可选链防护 (`?.`)。
- **M (可维护性 Maintainability)**: 检查函数职责单一性、命名规范、重复代码抽离及 PEP 257 文档字符串的完整性。

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

## 执行步骤

### 若审查对象为待办专案/方案目录：
1. **真实代码基线核验**：通过命令或 CodeGraph 探测相关接口、行数、环境变量与既有门禁。
2. **多维深度审查与打分**：按照六维雷达对 spec、plan、research、contracts、quickstart、tasks 逐一审查。
3. **持久化生成底稿**：**必须通过 `write_to_file` 工具在目标目录生成 `plan-review-{x}.md`（如 `plan-review-1.0.md`）**。
4. **输出审查总结**：向用户平铺直叙汇报核心结论、准入判定（APPROVED / CONDITIONAL / REJECTED）及后续整改指引。

### 若审查对象为代码实现/Git Diff/PR：
1. **本地静态检查**: 对变更文件执行 lint / typecheck（见「1. 本地静态检查」），失败则输出修复建议并要求重试。
2. **差异扫描 (Diff Analysis)**: 读取暂存区或指定分支的变更差异。
3. **SSLM 审查**: 对比上述四维标准逐文件检查。
4. **输出结论**: 按标准格式输出审查报告（明确结论：通过 / 需修改 / 拒绝），并列出具体的阻断、重要和建议事项。

---

## 安全专项加强模式 (Security Guard)

当代码涉及以下高风险场景时，自动激活安全专项扫描（在 SSLM 的 S1 层之上进一步深化）：

### 触发条件
- 涉及 OS 命令执行（如 `subprocess`, `os.system`）
- 涉及网络请求或 HTML 渲染
- 涉及序列化/反序列化（如 `pickle`, `yaml`）
- 涉及敏感权限校验（如登录、API Key 处理）

### 深度检测清单

**注入风险**
- 命令注入：严格审查 `shell=True` 的使用，强制要求数组形式传参
- XSS 防护：检查 HTML 模板中是否缺少转义字符
- SQL 注入：强制要求使用 ORM 占位符或参数化查询

**序列化安全**
- 严禁使用 `pickle.load` 处理不受信任的输入
- 建议使用 `json` 或 `SafeLoad`

**密钥与权限**
- 禁止明文存储或打印 API Key/Token
- 禁止在日志中记录完整请求头（可能包含 Auth Token）
- 禁止使用弱加密算法（如 MD5、SHA1 处理密码）
- 敏感接口必须有 `Depends(get_current_active_user)` 等鉴权装饰器

> [!CAUTION]
> 安全是生命线。在安全专项扫描发现 HIGH 风险警告时，必须中断操作并请求用户确认。

---

> [!IMPORTANT]
> 自动化检查是保证代码底线质量的第一道防线。务必确保本地静态检查全量通过。

## CNB PR 行级评审（CNB Review API）

（合并自原 `cnb-code-review` 技能）在 CNB 平台对 PR 变更做行级评审并回写评审意见时使用。

### 1. 获取 PR 变更

使用 `cnb-pr-diff` 技能获取 PR 的代码变更。

**需过滤的非代码文件**（不评审）：
- 依赖锁文件：`package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, `go.sum`, `Cargo.lock` 等
- 图片/字体/二进制/压缩文件：`*.png`、`*.woff`、`*.exe`、`*.zip`、`*.min.js`、`*.map` 等
- 构建产物目录：`dist/`, `build/`, `out/`, `target/`, `.next/`；依赖目录：`node_modules/`, `vendor/`, `.venv/`

**文件限制**：最多评审 30 个文件；diff 最大 100000 字符（超出则截断）。

### 2. 分析代码

- **只评审新增代码**（diff 中 `+` 开头的行，不含 `+++` 文件头）；禁止评审删除/上下文/未修改代码。
- 忽略 EOF 换行符、行尾空格、缩进风格（应由 linter 处理）。
- 当 diff 上下文不足以理解代码时，使用 Read 工具读取源文件确认准确行号。

### 3. 输出评审结果（JSON）

```json
{
  "status": "passed | needs_modification | critical",
  "issues": [
    {
      "severity": "critical | warning | info",
      "file": "文件路径",
      "start_line": 起始行号,
      "end_line": 结束行号,
      "problem": "问题：描述问题",
      "suggestion": "建议：修复建议"
    }
  ]
}
```

- `status`: `passed` 通过 / `needs_modification` 需要修改 / `critical` 存在严重问题
- `severity`: `critical` 严重（安全漏洞、崩溃 Bug）/ `warning` 警告 / `info` 建议
- `start_line`/`end_line` 对应 **diff 新文件行号（右侧）**，务必通过读取源文件确认
- 无问题时 `issues` 为空数组 `[]`

### 4. 发送评审评论

API 基础地址从 `CNB_API_ENDPOINT` 获取（默认 `https://api.cnb.cool`），仓库名从 `CNB_REPO_SLUG`，PR 编号从 `CNB_PULL_REQUEST_IID`。

**有问题时**（PostPullReview 行级评论，最多 10 条，优先严重程度高的）：

```bash
curl -X POST \
  "${CNB_API_ENDPOINT:-https://api.cnb.cool}/${CNB_REPO_SLUG}/-/pulls/${CNB_PULL_REQUEST_IID}/reviews" \
  -H "Accept: application/vnd.cnb.api+json" \
  -H "Authorization: Bearer $CNB_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
  "body": "**评审结果**: 需要修改",
  "event": "comment",
  "comments": [
    {"body": "问题: ...\\n建议: ...", "path": "文件路径",
     "start_line": 起始行号, "start_side": "right",
     "end_line": 结束行号, "end_side": "right",
     "subject_type": "line"}
  ]
}'
```

**无问题时**（PostPullComment 总结评论）：

```bash
curl -X POST \
  "${CNB_API_ENDPOINT:-https://api.cnb.cool}/${CNB_REPO_SLUG}/-/pulls/${CNB_PULL_REQUEST_IID}/comments" \
  -H "Accept: application/vnd.cnb.api+json" \
  -H "Authorization: Bearer $CNB_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"body": "**评审结果**: 通过\\n\\n代码质量良好，未发现明显问题。"}'
```

## Execution Script (执行脚本)

为消除执行过程中的不确定性，请始终通过以下脚本执行此 skill：
- **入口**: `.agents/skills/code-review/execute.py`
- **调用示例**:
  ```bash
  python3 .agents/skills/code-review/execute.py --input '{"key": "value"}'
  ```
- **输出格式**: 标准化的 JSON 结果，包含 `status`, `message`, `data` 字段。

## 思维链引导

在执行复杂步骤、架构设计或遇到歧义时，必须通过 `<thought>` 标签显式输出你的思考过程和逻辑推导，然后再输出最终行动或代码方案。
