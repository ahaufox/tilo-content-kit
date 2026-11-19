---
trigger: model_decision
description: 测试与质量保障规范，涵盖 Python 后端测试环境 SSOT、多渲染实例主路径断言与 Mock 隔离防呆。
globs: "**/tests/**/*, **/*test*.py, **/*test*.ts, **/*test*.tsx"
---

# TDD 与测试规范 (TDD & Testing Standards)

> **Scope (Globs)**: `["**/tests/**/*", "**/*test*.py", "**/*test*.ts", "**/*test*.tsx"]`

## 1. 核心测试策略：抓大放小（主干契约与致死路径优先）

- **放弃防御性完美主义**：
  - 严禁堆砌繁琐易碎的纯 UI 组件级单测；
  - 非核心的 UI 视觉瑕疵、偶发样式问题与极端罕见边界，采取真实业务踩坑后再行针对性修复的策略，不做过度前置防御。
- **聚焦主干契约与致死路径**：
  - 投入核心精力编写少量端到端自动化脚本（如 Playwright E2E、契约测试、高价值集成测试），重点保障以下关键业务流稳定：
    1. **核心状态机流转**：工作流节点生命周期推进、两阶段意图识别与命令派发、SSE 流式协议闭环；
    2. **关键交易与落库**：支付与订单流转、案卷材料解析物化落库、MinIO 与元数据双轨持久化；
    3. **主干数据契约**：API 契约一致性（OpenAPI 强契约）。
- **LLM 测试分级原则**：
  - 基础设施与纯代码管线单测可使用 `mock_llm` / `mock_http` 进行快速隔离，避免外部依赖；
  - **凡涉及大模型返回内容测试、提示词工程/配方评测、智能体推理决策、文书正文生成、结构化抽取与质量验证等场景，强制使用真实大模型（Live LLM）进行测试**。严禁仅凭静态 Mock 冒充真实内容测试。

## 2. Python 测试环境与执行路径规范 (SSOT)

- **虚拟环境与工作目录 (强制)**:
  - 依赖统一安装在项目根目录 `.venv` 虚拟环境中。
  - **业务后端工作目录为 `tilo-backend-app/backend/`**（Python: `../../.venv/bin/python`，测试: `../../.venv/bin/pytest`）；
  - **核心引擎工作目录为 `tilo-core-engine/`**（Python: `../.venv/bin/python`，测试: `../.venv/bin/pytest`）。
  - **严禁裸调全局/系统默认 `pytest` 或未对齐的 Conda 环境**，避免依赖分叉导致 `ModuleNotFoundError`。
- **标准执行命令**:
  - 业务后端单测运行：`cd tilo-backend-app/backend && ../../.venv/bin/pytest <test_file_path> -v`
  - 业务后端静态检查：`cd tilo-backend-app/backend && ruff check <files> && ../../.venv/bin/mypy <files> --config-file mypy.ini`
  - 核心引擎单测运行：`cd tilo-core-engine && ../.venv/bin/pytest <test_file_path> -v`
  - 核心引擎静态检查：`cd tilo-core-engine && ruff check <files> && ../.venv/bin/mypy <files> --config-file mypy.ini`
- **执行范围与频率约束**:
  - 避免频繁全量测试，日常优先针对当前修改的单个文件或函数运行精准测试。全量回归仅在准备提交前执行。

## 3. 关键隔离与 Mock 路径防呆 (避坑必读)

- **主路径优先断言 (Primary Path Test Coverage)**:
  - 同一组件在页面中被渲染多次时（如主编辑器 + 只读 Dialog），测试断言必须使用**可区分渲染实例的特征值**（如 `docId`、`data-testid`）精准定位主交互实例，**严禁依赖 `calls[0]` 或 `calls[calls.length - 1]` 的时序假设**。
- **同名测试包导入隔离 (`--import-mode=importlib`)**:
  - 当子目录存在与顶层 `tests/` 同名的包结构时，pytest 易发生模块覆盖寻址报错。执行多重同名测试包时必须携带 `--import-mode=importlib`。
- **ReadableStream 隔离**:
  - `ReadableStream` 单次消费后即锁定。在 Mock 多次流式请求时，**严禁**复用同一个流实例；必须使用返回全新流实例的 Factory。
- **动态导入 Mock 的原始路径对齐**:
  - 使用 `patch` 替换在函数内部动态 `import` 的变量时，必须直接 patch 其**原始定义所在模块**（如 `utils.redis_client.redis_client`），而非消费模块的局部变量名。
- **pytest `-k` 表达式防空收集伪绿灯 (210 复盘)**:
  - 严禁在测试命令或自动化脚本中使用与真实类名/方法名脱节的 `-k` 表达式；
  - pytest 在未匹配到任何用例时默认返回退出码 0，验证凭据必须明确核对 `collected X items` 且用例数大于 0，严禁将收集数为 0 的退出码 0 作为通过依据。
- **控制参数与降级分支双态覆盖 (210 复盘)**:
  - 控制开关参数（如 `fallback_to_template`）必须编写正反双态测试用例，分别断言 `True` 返回降级产物、`False` 抛出业务异常，防止死参数；
  - 具有降级/回退逻辑的模块（如依赖 `AgentRegistry` 未初始化回退本地装配），必须编写显式 Mock 注册中心返回 `None` 的独立参数化用例，防止本地分支缺陷被单例环境掩盖；
  - 异常透传契约测试：即使开启降级兜底，底层专有配置异常（如 `RecipeNotFoundError`）仍必须原样抛出，必须有专门用例断言其未被盲目改写。

## 4. LLM 返回内容与提示词测试标准 (Live LLM 与 3 次稳定性门禁)

- **适用范围**:
  - 凡涉及大模型返回内容测试、Prompt 配方评测、智能体（Agent/Workflow）决策输出验证、公文/文书生成质量验证、结构化要素提取（XML/JSON）及认知路由的测试用例与验证脚本。
- **强制使用 Live LLM 进行真实测试**:
  - 严禁仅依赖静态 Mock 数据或假占位符验证 LLM 生成逻辑；
  - 必须调用真实 LLM 模型接口（Live LLM）进行端到端测试，验证模型真实理解、格式遵循与正文质量。
- **测试至少执行 3 次以确保返回内容稳定**:
  - 考虑到大模型生成具有随机性与温度波动，**单项 LLM 返回内容测试必须至少执行 3 次**（重复运行或循环采样 $\ge 3$ 次）；
  - **核心稳定性断言维度**：
    1. **结构闭合与 Schema 校验**：3 次运行中 XML 标签必须 100% 正常闭合，JSON 必须 100% 能被 Pydantic/json.loads 正确反序列化，核心必填字段无缺失；
    2. **元指令净化与防泄漏**：3 次运行产物中完全不包含 System Prompt 中的内部指令、门禁词或角色人设元标签；
    3. **业务逻辑与事实一致性**：3 次运行的核心研判结论、关键案情要素提取必须保持收敛一致，不出现事实性幻觉或逻辑坍塌；
    4. **异常容错率**：严禁出现任意一次截断、空响应或 500 异常。
- **物理凭据要求**:
  - 任务验收凭据中，必须如实附带至少 3 次 Live LLM 真实运行的执行命令、输出关键摘要或稳定性对账表，严禁凭空断言“测试通过”。

## 5. 测试中类型忽略规范

- 测试代码中使用 `# type: ignore[<error-code>]` 时必须指定具体错误码（如 `method-assign` / `attr-defined`），严禁使用裸 `# type: ignore`。
- 仅用于 Mock 替换系统边界（静态/类方法、私有方法、动态注入属性），严禁用于掩盖业务代码的真实类型缺陷。

## 6. 相关技能 (Related Skills)

通用测试模式、TDD 工作流及属性测试等最佳实践，请按需调用对应技能：
- **`tdd`**：TDD 驱动开发三步法。
- **`e2e-testing`**：Playwright E2E 回归测试与 API Mock。
