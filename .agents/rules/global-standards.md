---
trigger: always_on
---

# 全栈通用核心准则

> **Scope (Globs)**: `["*"]`

## 1. 架构演进与风险分级
全栈决策遵循：**安全 > 质量 > 速度**。
- **架构方向**: 客户端演进为 `frontend-v2/`（Next.js 16+ App Router），采用薄 Page + `lib/queries` / `lib/normalize` / `lib/format` 分层解耦。
- **风险分级**:
  - **P0 (阻断级)**: 密钥/PII 泄露、SQL 注入、鉴权绕过、数据丢失、物理文件无托底。
  - **P1 (必验级)**: 登录鉴权、核心案件流转、外部 API 契约、DB Migration。
  - **P2 (建议级)**: UI/文案微调、内部脚本。

## 2. 核心红线 (不可逾越)
- **安全与权限**: 严禁明文存储敏感信息；严禁字符串拼接 SQL。公开接口严格收敛于 `public_routes.py` 白名单；私有案件资源强制挂载 `require_case_access` 守卫（越权统一 404）；Service 层禁止使用 ContextVar 读取属主。
- **数据库**: 表结构变更必须使用 Alembic，严禁直接执行 DDL。业务时间使用 `utils.timezone.now_cst_naive()`，JWT 使用 `now_utc_aware()`。在 SQLModel 表模型中定义 naive datetime 字段（如 `created_at`、`updated_at`、`xxx_at`）时，**必须显式指定 `sa_type=DateTime(timezone=False)`**（或 `sa_column=Column(DateTime(timezone=False), ...)`），严禁使用未显式关闭时区的裸注解，杜绝 SQLModel 内部 `UTCDateTime` 强制时区校验引发入库崩溃。
- **大模型提示词与前缀缓存**: 静态前缀严禁混入动态变量；结构化提取统一使用 `backend/utils/llm/xml_blocks.py`。
- **文件持久化托底**: 生成文书与材料必须上传 MinIO 并登记 `FileMetadata`；资产正文必须在 `CaseNodeAsset.payload["content"]` 留存 Markdown 底座；下载端点挂载自愈兜底，杜绝容器重启丢文件。
- **铁证防主观幻觉**: 严禁未真实运行验证即宣称“测试通过”；严禁在缺乏真实证据时虚构法律研判结论。所有结论必须附带命令输出或日志凭据。
- **测试策略（抓大放小 · 主干契约与致死路径优先）**: 放弃防御性完美主义，不写繁琐易碎的 UI 组件级单测；以少量端到端自动化脚本（如 Playwright）跑通核心业务流（核心状态机流转、支付、关键数据落库）；非核心 UI 瑕疵和极端边界踩坑后再修。

## 3. 语言规范与智能体表达
- **强制中文回复**: 无论用户何种语言，回复、文档、注释及 **Git 提交信息（Conventional Commits）必须严格使用中文**。
- **零谄媚直奔主题**: 严禁使用虚浮奉承与情绪套话，执行控制与客观文风表达严格遵守 [agent-loop-control-standards.md](./agent-loop-control-standards.md)。
- **平铺直叙客观文风 (反誓言与反口号)**: 规划、文档、方案、代码注释与答复中，少用/禁用“绝不”、“保证”、“铁律”、“死守”、“坚决”、“严防”等誓言式与绝对化修饰词；杜绝口号化、夸张性或情绪化修辞；陈述事实、职责分工、指标与预案时保持客观、平铺直叙。
- **全局用户界面展示命名空间**: 面向普通用户与律师的 UI 视图、弹窗、Tab 标签与引导文案，**严禁使用开发者内部术语**（严禁“录入/清洗/交付物/物化/沙盒/驾驶舱/影响池/只读冻结/陈旧/沉淀/资产”等），统一遵守 `design.md §8` 与 `CONTEXT.md` 法定专业用词。
- **Docstring 规范**: Python 模块、类及函数注释统一使用 **Google Style Docstrings**（中文描述，含 Args/Returns/Raises）。

## 4. 任务事实来源与任务归档 (SSOT)
- **前置阅读**: 做任何事前先查阅 `docs/00-7待办/`（当前待办与已完成目录）与 `docs/02-规划/`，避免脱离既有规划。
- **任务归档机制**: 任务执行统一在 `docs/00-7待办/<分层>/<专案>/`（主仓跨仓专案收敛于 `04-混合/`，单仓专案收敛于对应子仓 `docs/00-待办/<专案>/`）下进行；任务闭环后，原始方案与脚手架不做物理删除，统一完整移动至对应仓的 `已完成/<专案>/` 保留复盘底稿，未来由人工定期手动批量清理。物理目录位置即状态，无需维护中心化总清单。

## 5. 全链路字段映射防呆与节点调度契约 (SSOT)
- **单一事实来源**: 后端 `contracts/openapi-*.json` 与强类型 SDK（`@tilo/api-client` / `tilo-core-sdk`）是数据契约的单一源头。
- **强类型独治**: 前端严禁手写 API 响应 interface，必须从生成类型导入；禁止在业务层手动写 `snake_case ↔ camelCase` 映射，统一收敛在 Schema 基类（`CamelCaseBaseModel`）或 `lib/normalize/`。
- **Pydantic model_dump() 键命名契约**: 请求模型（如 `UIStateRequest`）经 Pydantic `model_dump()` 转换为字典后，其键名统一且唯一为 Python 字段标准命名（`snake_case`，如 `selected_node_key`）。业务服务层（如 `intent_compiler.py`）、Agent 与 Handler 读取该字典时**必须严格且唯一使用 `snake_case`（如 `ui_state.get("selected_node_key")`）**，严禁做 `camelCase`（如 `selectedNodeKey`）双向冗余兼容，彻底杜绝键名混淆导致的隐性 `None`。
- **严禁静态节点意图匹配器**: 工作流节点的执行调度必须严格依赖上下文强契约（`selected_node_key` / `target_node_key`）或模型 Tool-Calling 动态识别，**严禁在代码中维护 `node_matcher` 或针对工作流节点的正则表达式/文本字典映射表**。坚决杜绝此类硬编码引入的沉重维护负担与潜在分叉。

## 6. 环境日志检查强制门禁
在功能实现、联调与排错中，标记任务完成前**必须检查相关环境报错日志**：
- **后端核心报错**: 相对工作区根目录 `tilo-backend-app/backend/logs/{APP_ENV}_{BACKEND_PORT}/error.log`（或核心引擎 `tilo-core-engine/logs/...`）；同目录 `info.log` 用于补充上下文。按服务实际运行配置选择环境与端口，并确认无未捕获异常、500 错误或 Python Traceback。
- **代理与网络路由**: `/var/log/nginx/error.log`（排查 502/504 Upstream 异常；仅 Linux dev 栈存在 Nginx，macOS 本机无此环境，见 §9）。

## 7. 架构防腐与文件体量分级治理
详见 `docs/03-技术/08-规范与契约/全栈高频热点文件防腐分析.md`：
- **拒绝机械唯行数论（防腐看本质）**：代码健康度核心看职责内聚性、圈复杂度与函数粒度，严禁脱离实际功能单纯依据物理行数机械一刀切，杜绝为凑行数指标将高内聚逻辑切成无复用价值的碎片文件。
- **职责分类分级弹性阈值**：
  - **纯契约/数据/资产（Types/Schemas/Enums/Prompt模板/测试Golden）**：**豁免物理行数硬上限**，优先保证单一事实来源 (SSOT) 集中管理与快速检索，严禁强行切碎同域契约。
  - **高内聚状态机与解析编排（SSE流解析/工作流引擎/编译器）**：推荐 ≤ 500 行，弹性上限 800~1000 行；核心门禁为单状态转换函数 ≤ 50 行、嵌套深度 ≤ 3 层且因果闭环。
  - **UI 视图组件与复杂面板（Drawer/Dialog/Panel/Workspace）**：推荐 ≤ 400 行，弹性上限 700~800 行；践行**薄视图（逻辑表现分离）**，业务状态/API 请求必须剥离至 Hook/Store，允许声明式 JSX 布局，严禁过度拆分仅供单处使用的私有展示碎片。
  - **页面入口编排 (`page.tsx`)**：推荐 ≤ 150 行，弹性上限 250~350 行；仅负责骨架布局与 Provider 挂载，不直连数据请求。
  - **业务服务与路由 Handler (`*service.py`, `*router.py`)**：推荐 ≤ 400 行，弹性上限 600~800 行；**函数粒度硬上限**：单函数推荐 ≤ 50 行，硬上限 150 行。
  - **自定义 Hook (`use*.ts`)**：推荐 ≤ 250 行，弹性上限 450 行；单一关注点，多状态协同可拆原子 Hook 再聚合。
  - **测试用例与夹具 (`tests/`, `*.spec.ts`)**：**不设行数上限**，保障核心业务契约覆盖度。
- **拆分自检与免拆原则**：
  1. **优先拆函数而非拆文件**：文件过长若因单个超长函数引起，优先在同文件内拆解私有小函数或管道编排；
  2. **反过度组件化**：若拆出的子组件仅在当前文件内部消费且无跨模块复用价值，允许保留在同文件内；
  3. **高内聚事务不割裂**：涉及完整状态机或严格因果链的业务逻辑，保持单文件更优于跨文件跳转。
- **热点文件禁原地堆叠**: 禁止在核心枢纽大文件内无节制追加 `if-else`，优先提取独立策略、服务或组合子组件。
- **严禁分层反向依赖**: 下层服务严禁反向导入上层路由（`routers`）。

## 8. 命名查重复用原则
- **先查后增**: 遇到文案、常量或状态命名时，必须先检索集中管理目录（前端 `text-constants/`，设计 Token `globals.css`，后端 `enums.py`）；已有命名必须直接复用，严禁新建同义变量。

## 9. dev 环境启动平台差异 (macOS 本机 / Linux dev 栈)
- **macOS 本机 dev**：不存在 Nginx 环境，服务以 127.0.0.1 直连方式运行（端口段 9xxx，与 dev 栈 8xxx 并行共存）。启动统一使用专用启动器 `dev-ops/mac-local.sh`：
  - `bash dev-ops/mac-local.sh backend [-c]` — 前台启动业务后端（`-c` 联动核心研判引擎）；
  - `bash dev-ops/mac-local.sh frontend` — 前台启动用户前端 Next.js；
  - `bash dev-ops/mac-local.sh admin` — 构建管理后台静态产物；
  - `bash dev-ops/mac-local.sh all` — 一键后台拉起核心引擎 + 后端 + 前端并统一管理，日志归档至 `logs/mac-local/<YYYYMMDD>/`。
  - 本机私有配置 `.env.local`（不随 git 同步）缺失时自动从 `.env.local.example` 初始化；代理排查项 `/var/log/nginx/error.log` 在 macOS 本机不适用，验收说明中应客观标注"不适用"，不得作为未完成项记录。
- **Linux dev 栈**：具备 Nginx 反代环境（test.mateai.work:441 → FRP → Nginx，端口段 8xxx），启动使用 `dev-ops/` 下的标准脚本（`dev-deploy.sh` 部署基础底座、`core-engine.sh`、`backend.sh [-c]`、`frontend.sh`、`admin.sh`）；代理与网络路由问题按 §6 检查 `/var/log/nginx/error.log`。
- **判断依据**：按 `uname -s` 与实际部署形态选择启动链路；涉及 Nginx、FRP、域名反代的验证步骤仅在 Linux dev 栈执行，macOS 本机以 127.0.0.1 直连端口为准。

## 10. 多仓协同与 Git Submodule 规范 (Multi-Repo & Submodule Standards)
- **多仓拓扑与分工边界**:
  - 主仓 `law_tech` 采用 **Git Submodule** 统一管理各独立微服务与前端组件；
  - 业务后端 `tilo-backend-app` 为独立子仓（零 Prompt、零大模型私钥，面向外部协作者开放）；
  - 核心研判引擎 `tilo-core-engine` 为独立子仓（Prompt 资产与无状态推理 SSOT）；
  - 历史基于脚本强拷贝同步的机制（`sync_app_from_backend.sh`、`sync_backend_from_app.sh` 等）已彻底废弃。
- **标准子模块提交流程 (SSOT)**:
  - **用户 Review 门禁（提交前置条件）**：以下多仓提交流程**仅在用户 Review 通过并明确发出提交指示后方可执行**。智能体在日常开发或缺陷修复中，严禁未获确认私自自动执行子仓或主仓提交与推送。
  - **子仓代码提交与推送**: 在用户明确确认后，在对应的子模块目录下进行独立的 Git 提交与推送：
    ```bash
    # 业务后端修改
    cd tilo-backend-app && git add . && git commit -m "feat(xxx): ..." && git push origin <branch>
    # 核心研判引擎修改
    cd tilo-core-engine && git add . && git commit -m "feat(xxx): ..." && git push origin <branch>
    ```
  - **主仓子模块指针更新**: 子仓推送后，必须在主仓更新子模块版本指针并提交：
    ```bash
    git add tilo-backend-app tilo-core-engine
    git commit -m "chore(submodule): 对齐子模块最新指针"
    git push origin <branch>
    ```

## 11. 相关技能 (Related Skills)
- **`start-work`**：会话启动与环境健康自检。
- **`task-handover`**：结构化任务交接。
- **`infra-git-auto-suite`**：Git 规范化提交与自动化发布。
