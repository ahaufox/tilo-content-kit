---
trigger: model_decision
description: CI 与代码格式化规范，包含 Ruff、Biome、ESLint 的强制校验要求及字段映射防呆 AST 专项检查。
globs: "**/.github/workflows/**/*, **/.husky/**/*, backend/scripts/**/*, ruff.toml, biome.json, **/.eslintrc*"
---

# CI 与代码格式化规范

> **Scope (Globs)**: `["**/.github/workflows/**/*", "**/.husky/**/*", "backend/scripts/**/*", "ruff.toml", "biome.json", "**/.eslintrc*"]`

为了保证代码质量、提高协作效率，并确保 CI (GitHub Actions) 自动化检查顺利通过，降低因为格式不统一导致的代码冲突和 Review 成本，请所有开发人员和 AI Agent 严格遵循以下规范：

## 1. 后端规范 (Python)
后端统一使用 **Ruff** 作为 Lint 和 Format 工具，**MyPy** 作为静态类型检查工具。

- **格式化标准**: 遵循 Ruff 默认规则（类似于 Black 风格，但更快速）。
- **行宽限制**: `120` 字符。
- **建议要求**:
    - 提交代码前，建议在 `backend` 目录下执行 `ruff check . --fix` 自动修复常见格式与导入错误。
    - 提交代码前，建议执行 `mypy .` 确保无阻塞性的静态类型错误（当前配置已在 `mypy.ini` 中忽略了部分非关键的动态类型警告，但基础结构必须正确）。

## 2. 前端规范 (React/TypeScript)
前端根据子项目不同，分别采用以下工具链，并且 CI 会进行严格拦截。

### 2.1 管理端 (admin-frontend)
- **工具链**: [Biome](https://biomejs.dev/)
- **操作规范**: 提交前建议确保 `npm run lint` 没有 Error 级别的警告。

### 2.2 用户端 (frontend-v2)
- **工具链**: **ESLint** (结合 TypeScript 和 React 插件)
- **操作规范**: 遵循 `.eslintrc.cjs` 中的配置，重点修复未使用变量、未定义类型等语法层面的错误。

## 3. Git 提交规范 (Conventional Commits)

> **注意**：Git 提交规范已合并到 `git-commit-message.md`。本文件仅保留引用。

Git 提交规范（Conventional Commits 格式、类型说明、中文撰写要求）请参阅：
- **`git-commit-message.md`**：完整的 Git 提交规范，包括 Conventional Commits 格式、类型说明、中文撰写要求。

## 4. CI 拦截机制
GitHub Actions 已配置对上述两套规范进行强制校验。如果由于本地未格式化或类型不兼容导致 CI 失败：
1. 请先查看 CI 报错日志（例如 Ruff 或 Biome 的输出）。
2. 在本地对应目录执行 `lint` 和 `build` 脚本进行修复。
3. 重新提交。

## 5. 字段映射防呆 AST 专项检查 (Field Mapping AST Audit)

> 本节是 `global-standards.md §11 全链路字段映射防呆` 的 CI 落地条款。

### 5.1 检查工具与运行方式

在 `tilo-backend-app/backend/scripts/rule_auditor/checkers/field_mapping_checks.py` 中实现了字段映射防呆专项 AST 检查，统一由 `tilo-backend-app/backend/scripts/audit_rules.py` 调度。

| 检查项 | 工具 | 运行命令 | 当前阶段 |
|--------|------|----------|----------|
| 后端 Schema 未继承基类 | Python AST | `cd tilo-backend-app/backend && python scripts/audit_rules.py --only field-mapping-backend` | 报告不阻断 |
| 后端 Router 返回字典 | Python AST | `cd tilo-backend-app/backend && python scripts/audit_rules.py --only field-mapping-backend` | 报告不阻断 |
| 前端手写 API 响应 interface | TypeScript AST / 正则 | `cd tilo-backend-app/backend && python scripts/audit_rules.py --only field-mapping-frontend` | 报告不阻断 |
| Payload 容器键名漂移 | Python AST + 轻量数据流 | `cd tilo-backend-app/backend && python scripts/audit_rules.py --only field-mapping-key-drift` | 新增即阻断（error） |

### 5.2 后端检查规则

**检查 1：新增 Schema 未继承指定基类**

扫描 `backend/schemas/` 下所有 `class XxxYyy(BaseModel)` 或 `class XxxYyy(SQLModel)` 定义：
- 如果继承的是 `BaseModel` 而非 `CamelCaseBaseModel`，报告为"未继承防呆基类"。
- 如果继承的是 `SQLModel` 而非 `CamelCaseSQLModel`，报告为"未继承防呆基类"。
- 存量代码报告时标注 `[存量]` 前缀，新增代码标注 `[新增]` 前缀。

**检查 2：Router 返回字典**

扫描 `tilo-backend-app/backend/routers/` 下所有路由函数（`@router.get/post/put/patch/delete` 装饰的函数）：
- 如果函数体中存在 `return {` 且返回体包含业务字段（非豁免场景），报告为"路由返回字典"。
- 豁免场景（健康检查、测试夹具、极简状态确认）通过路径模式匹配自动排除：
  - `routers/**/tests/` 下的文件
  - 函数名包含 `health`、`ping`、`status` 的端点
  - 返回体仅包含 `{"success": bool}` 或 `{"status": str}` 的极简字典

**检查 4：Payload 容器键名漂移**

由 `tilo-backend-app/backend/scripts/rule_auditor/checkers/payload_key_drift_checks.py` 实现，扫描后端 `routers/`、`services/`、`workflow/` 与核心引擎 `workflow/`、`agents/`、`services/`：

- **契约注册表**：`CONTAINER_SCHEMA_MAP` 声明 payload 容器键 → Schema 模型（`established_baseline` → `EstablishedBaseline`、`case_stage_context` → `CaseStageContext`、`materials_overview` → `MaterialsOverview`）。
- **来源追踪**：沿函数内赋值链解析 `x = stage_ctx.get("established_baseline") or {}`、`x = dict(y)`、三元表达式等形态，确定字典变量承载的容器。
- **键校验**：对已绑定变量上的 `.get(key)` 与 `[key]` 读取，键必须命中 Schema 字段（含 camelCase 别名），否则报 error。
- **遗留键豁免**：`legal_cause` 等历史键**仅当同一 `or` 链内已读取真实字段**（`cause_of_action`）时豁免，防止以「兼容」名义写回单边错误键。
- **判据来源**：条款 SSOT 见 [backend-python-standards.md §3.3](backend-python-standards.md)。

### 5.3 前端检查规则

**检查 3：手写 API 响应 interface**

扫描 `frontend-v2/src/types/` 和 `admin-frontend/src/services/types/` 下的 `.ts` 文件：
- 如果文件中存在 `export interface \w+(Response|Item|Detail|Info|List)\b` 且该 interface 的字段与 `@tilo/api-client` 制品库中已有类型高度相似（字段名重合度 ≥ 60%），报告为"手写 API 响应 interface"。
- 存量代码报告时标注 `[存量]` 前缀，新增代码标注 `[新增]` 前缀。

### 5.4 渐进阻断策略

| 阶段 | 后端 Schema 检查 | Router 字典检查 | 前端 interface 检查 |
|------|------------------|-----------------|---------------------|
| 当前 | 报告不阻断 | 报告不阻断 | 报告不阻断 |
| 过渡期后 | 仅 `[新增]` 阻断 | 仅 `[新增]` 阻断 | 仅 `[新增]` 阻断 |
| 全量收敛后 | 全量阻断 | 全量阻断 | 全量阻断 |

过渡期时长根据存量迁移进度动态调整，由团队评估后切换。

### 5.5 本地运行

```bash
# 后端检查
cd tilo-backend-app/backend && python scripts/audit_rules.py --only field-mapping-backend

# 前端检查
cd backend && python scripts/audit_rules.py --only field-mapping-frontend

# 全量字段映射检查
cd backend && python scripts/audit_rules.py --only field-mapping

# Payload 容器键名漂移检查（写读键名对齐 Schema）
cd backend && python scripts/audit_rules.py --only field-mapping-key-drift

# 仅新增违规阻断
cd backend && python scripts/audit_rules.py --only field-mapping --fail-on-new
```

### 5.6 路由鉴权与越权安全 AST 检查 (Auth & IDOR Checks)

详见 [backend-auth-security-standards.md](backend-auth-security-standards.md)。
检查器扫描未授权路由、未挂载 `require_case_access` 守卫的水平越权风险以及 DTO 敏感字段泄漏（`created_by_id` / `role="admin"`）。

```bash
# 运行鉴权与 IDOR 安全检查（新增违规直接阻断，存量基线警告）
cd backend && PYTHONPATH=. python scripts/audit_rules.py --only auth-security --fail-on-new

# 更新鉴权与越权基线（仅在存量代码安全审查后执行）
cd backend && PYTHONPATH=. python scripts/audit_rules.py --update-auth-baseline
```

## 6. 相关技能 (Related Skills)

执行本规则前，应加载以下技能：

- **`code-review`**：本规则要求 CI 拦截作为质量门禁之一；提交前应配合该技能完成 SSLM（Security/Standards/Logic/Maintainability）四维审查，并执行本地静态检查（ruff / mypy / npm run lint+build）。
- **`bug-ops`**：本规则 §5 字段映射防呆 AST 专项检查用于自动发现字段映射缺陷；配合该技能进行深度 Bug 挖掘与诊断。

完整技能索引参见 `.agents/skills/README.md`。
