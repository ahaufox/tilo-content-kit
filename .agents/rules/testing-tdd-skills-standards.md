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

## 4. 测试中类型忽略规范

- 测试代码中使用 `# type: ignore[<error-code>]` 时必须指定具体错误码（如 `method-assign` / `attr-defined`），严禁使用裸 `# type: ignore`。
- 仅用于 Mock 替换系统边界（静态/类方法、私有方法、动态注入属性），严禁用于掩盖业务代码的真实类型缺陷。

## 5. 相关技能 (Related Skills)

通用测试模式、TDD 工作流及属性测试等最佳实践，请按需调用对应技能：
- **`tdd`**：TDD 驱动开发三步法。
- **`e2e-testing`**：Playwright E2E 回归测试与 API Mock。
