# AI Agent Rules Index

This directory contains rules for AI agents.

## Standard Header Format

- **`trigger: always_on`**: 常驻规则，无需 `description` 与 `globs` 字段。
- **`trigger: model_decision`**: 动态匹配规则，必须包含 `description` 与 `globs` 字段。

## Categories

- **frontend-**: Frontend specific rules.
- **backend-**: Backend specific rules.
- **infra-**: Infrastructure related rules.
- **通用**: 跨域通用规则 (General cross-cutting rules).
- **memory-**: 智能体记忆系统 (Memory system).

## 规则强度分级 (Rule Strength Levels)

为避免规则过度束缚 Agent，本目录规则统一采用三级语气，修订规则时请对号入座：

| 级别 | 用词 | 含义 | 适用内容 |
|------|------|------|----------|
| **红线 (Hard)** | 严禁 / 必须 | 不可放宽的硬性约束 | 安全红线、权限/鉴权、数据隔离、Alembic 迁移、不手改自动生成 API 层、业务时间/JWT 时区约束、日志检查门禁 |
| **强制 (Must)** | 必须 | 结构性约定，偏离需说明理由 | 架构模式（Repository、AgentRegistry、ScopedState 等）、CI 拦截、前后端契约同步 |
| **建议 (Recommended)** | 建议 / 推荐 / 应 | 最佳实践，允许 Agent 因地制宜 | 代码风格、命名、文档注释、流程步骤、行数上限、测试策略等非关键项 |

> 修订原则：非关键条款请用“建议/推荐”而非“必须”；删除冗余重复的限制；合并相似条目；**AI 天然不易犯错的常识性条款（语言语法、工具基本用法、常规代码风格）不写入规则**，交给模型常识与技能覆盖；**规则中引用的技能名必须与 `.agents/skills/` 目录实际存在的一致**；保持规则精炼、可操作、不过度束缚 Agent。

## Files (Consolidated)

> 该目录在 2026-07-09 完成了深度规整（Phase 2），所有碎片化规则均已被合并到以下领域主干文件中，并配有精确的 Globs 作用域触发器，作为单一事实来源 (SSOT)。

### Frontend
- `[File] frontend-standards.md` — React & 前端工程开发规范，整合了架构解耦、状态管理、代码风格与兜底渲染。
- `[File] frontend-desktop-standards.md` — 桌面客户端 (Desktop Workspace) 开发与跨端同步规范，明确 Web 端一致性首选原则、DRY 复用机制、桌面特化与共享边界、双模态平滑降级与架构防腐。
- `[File] frontend-editor-standards.md` — 富文本协同编辑器开发规范，包含 Tiptap/Yjs 协同、双态存储与编辑器工具栏 Portal 约束。
- `[File] design.md` — 前端 UI 视觉设计与动效规范，包含 Design Token、排版、暗黑模式、响应式布局及 Framer Motion 动画约束。

### Backend
- `[File] backend-auth-security-standards.md` — 后端路由鉴权、权限控制与防越权长效规范，包含三层防御矩阵、公共路由白名单 SSOT、声明式案件守卫、服务层显式传参及 CI 自动化门禁。
- `[File] backend-database-standards.md` — 后端数据库与数据访问综合规范，涵盖 Repository (DAO)、多表关联约束与 Alembic 迁移要求。
- `[File] backend-ai-workflow-standards.md` — 后端 AI 与工作流架构标准大典，涵盖 Agent 自包含架构、LangChain、XML 信封、动态回退及 Doc IR；§5.3–5.5 收敛 176 的执行身份、锁所有权与产出版本约束。
- `[File] backend-python-standards.md` — Python/FastAPI 后端开发基础规范，包含字段映射防呆基类与路由返回规范。
- `[File] backend-api-collaboration-rule.md` — 接口变更及前后端协作的标准流程。
- `[File] backend-startup-memory-safeguard.md` — 启动与内存防范规则。

### Infra & Governance
- `[File] infra-agent-governance-standards.md` — AI 助手规则与配置治理规范，治理大模型自身的记忆、技能设定与安全权限边界。
- `[File] infra-ci-formatting-standards.md` — CI 与代码格式化规范，包含字段映射防呆 AST 专项检查。
- `[File] infra-dependency-compat-rule.md` — 前端依赖兼容性规则（如 antd 与 UmiJS 冲突修复）。
- `[File] infra-minio-storage-standards.md` — MinIO/S3 对象存储使用规范，包含存储后端选择、预签名 URL 签发、连接池管理与健康对账。

### General & Process
- `[File] global-standards.md` — 全栈通用核心准则，包含全链路字段映射防呆总览与客观平铺直叙文风要求。
- `[File] docs-linkage.md` — 多仓文档体系分层归属、模式 A 主子同构待办流转、取号防撞与代码变更触发文档更新规范。
- `[File] agent-loop-control-standards.md` — 智能体执行控制与客观文风表达规范，涵盖防半途退出、两阶段门禁、疑问集中呈报、零谄媚客观沟通、平铺直叙反誓言文风及铁证防幻觉六大核心纪律。
- `[File] code-review-standards.md` — 全栈代码审查规范；§5.1 要求按真实入口、模型及业务后果核销修复，记录残留与新回归。
- `[File] task-completion-standards.md` — 任务完成与验收强制标准。
- `[File] git-commit-message.md` — Git 提交信息格式要求。
- `[File] system-robustness-and-defensive-programming.md` — 防御性编程与健壮性约束。
- `[File] streaming-standards.md` — 流式处理前后端统一规范（底层协议与架构 SSOT 详见 [sse流式事件说明.md](../../tilo-backend-app/backend/schemas/streaming/sse流式事件说明.md)）。
- `[File] testing-tdd-skills-standards.md` — TDD 与测试技能规范。
- `[File] e2e-testing-standards.md` — E2E 测试开发规范，涵盖 MCP 实时探针 + Run-Fix 自愈双环工作流、Web 双轨测试（mock/live）、核心工作流四专项（工作流执行/chat/意图识别/工具执行）与 Electron 桌面端避坑。

### Memory System
- `[File] memory-high.md` — 长期记忆。
- `[File] memory-middle.md` — 中期记忆。
- `[File] memory-low.md` — 短期记忆。
- `[File] memory-archive.md` — 记忆归档。
