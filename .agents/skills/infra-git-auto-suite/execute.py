#!/usr/bin/env python3
"""
git-auto-suite 执行器 (AI 驱动原子分组版)

接受 JSON 配置，对每个文件组（bucket）执行：
  0. 前置跨领域原子性防呆校验（严禁跨领域大杂烩提交）
  1. git add <files>
  2. 运行 AI 提供的 verify_cmds
  3. 通过则 git commit -m <message>；失败则 restore --staged 并记录错误
最后若指定 push 且有成功提交，则执行 git push。

支持 --preflight 模式：仅检测本地环境（Python 解释器/venv/pytest），不做网络操作。
"""

import argparse
import json
import os
import shutil
import subprocess
import sys
from typing import Dict, List, Any, Tuple, Optional, Set

PROTECTED_BRANCHES = {"main", "master", "develop"}


def _run(cmd: List[str], cwd: str = ".", env: Optional[Dict[str, str]] = None) -> Tuple[int, str, str]:
    """同步执行命令并返回 (returncode, stdout, stderr)。"""
    try:
        proc_env = os.environ.copy()
        if env:
            proc_env.update(env)
        proc = subprocess.run(
            cmd,
            cwd=cwd,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            env=proc_env,
        )
        stdout = (proc.stdout or "").strip()
        stderr = (proc.stderr or "").strip()
        return proc.returncode, stdout, stderr
    except Exception as e:
        return 999, "", str(e)


def _run_shell(cmd: str, cwd: str = ".") -> Tuple[int, str, str]:
    """在 shell 中执行命令。"""
    try:
        kwargs: Dict[str, Any] = {
            "shell": True,
            "cwd": cwd,
            "capture_output": True,
            "text": True,
            "encoding": "utf-8",
            "errors": "replace",
        }
        if sys.platform != "win32":
            kwargs["executable"] = "/bin/bash"
        proc = subprocess.run(cmd, **kwargs)
        stdout = (proc.stdout or "").strip()
        stderr = (proc.stderr or "").strip()
        return proc.returncode, stdout, stderr
    except Exception as e:
        return 999, "", str(e)


def preflight(repo: str) -> int:
    """本地环境预检，输出 JSON 后退出。不做 git fetch 等网络操作，保证快速。"""
    result: Dict[str, Any] = {
        "python_cmd": "python3",
        "has_venv": False,
        "has_pytest": False,
    }

    # 1. 检测 Python 解释器（避免硬编码，优先支持项目根目录 .venv 与 Conda law_tech 环境）
    candidate_patterns = [
        # 环境变量指定
        os.environ.get("PYTHON_CMD", ""),
        # 选项 A: 项目根目录 .venv
        os.path.join(repo, ".venv", "bin", "python3"),
        os.path.join(repo, ".venv", "bin", "python"),
        # 选项 B: Conda law_tech 环境（动态解析主目录与环境前缀）
        os.path.expanduser("~/miniconda3/envs/law_tech/bin/python"),
        os.path.expanduser("~/anaconda3/envs/law_tech/bin/python"),
        "/home/ahaufox/miniconda3/envs/law_tech/bin/python",
        os.path.join(os.environ.get("CONDA_PREFIX", ""), "bin", "python"),
        # 选项 C: backend 子目录下的 .venv
        os.path.join(repo, "backend", ".venv", "bin", "python3"),
        os.path.join(repo, "backend", ".venv", "bin", "python"),
        os.path.join(repo, "backend", ".venv_check", "bin", "python3"),
    ]
    for venv_py in candidate_patterns:
        if venv_py and os.path.isfile(venv_py) and os.access(venv_py, os.X_OK):
            result["python_cmd"] = os.path.abspath(venv_py)
            result["has_venv"] = True
            break
    else:
        # 回退到当前环境解释器或系统 python3
        found = shutil.which("python3") or shutil.which("python") or sys.executable
        result["python_cmd"] = found or "python3"

    # 2. 检测 pytest 可用性
    py = result["python_cmd"]
    rc, out, _ = _run([py, "-m", "pytest", "--version"], cwd=repo)
    result["has_pytest"] = (rc == 0)

    print(json.dumps(result, ensure_ascii=False))
    return 0


def classify_domain(filepath: str) -> str:
    p = filepath.strip().replace("\\", "/")
    if p.startswith("./"):
        p = p[2:]
    elif p.startswith("/"):
        p = p[1:]

    # 1. 数据库模型、迁移脚本、仓储层与关系字典 (backend_db)
    if (
        p.startswith("backend/models/")
        or p.startswith("backend/alembic/")
        or p.startswith("backend/repositories/")
        or p.startswith("sqls/")
    ):
        return "backend_db"

    # 2. Agent 规则、技能与指令基建 (agent_infra)
    if p.startswith(".agents/") or p == ".agents" or p in ("AGENTS.md", "GEMINI.md"):
        return "agent_infra"

    # 3. 独立文档与待办规划 (docs)
    if p.startswith("docs/") or p.endswith(".md"):
        return "docs"

    # 4. 后端核心服务、路由、Agent 与模式定义 (backend_core)
    if p.startswith("backend/"):
        return "backend_core"

    # 5. 用户端 Web 应用 (frontend_v2)
    if p.startswith("frontend-v2/") or p.startswith("src/") or p.startswith("public/"):
        return "frontend_v2"

    # 6. 管理后台 Web 应用 (admin_frontend)
    if p.startswith("admin-frontend/"):
        return "admin_frontend"

    # 7. 顶层工程基建、运维部署与脚本 (infra)
    if (
        p.startswith("scripts/")
        or p.startswith("dev-ops/")
        or p.startswith("prod-dev-ops/")
        or p.startswith("uat-ops/")
        or p.startswith(".github/")
        or p in ("Dockerfile", "docker-compose.yml", "package.json", "biome.json", "ruff.toml")
    ):
        return "infra"

    # 8. 根目录 openapi 契约
    if p == "openapi.json":
        return "api_schema"

    return "other"


# 互斥领域冲突矩阵（同一 Bucket 内禁止同时出现以下领域组合，除非显式指定 allow_mixed: true）
INCOMPATIBLE_DOMAIN_PAIRS = [
    # 后端代码 与 用户端前端
    ({"backend_db", "backend_core"}, {"frontend_v2"}, "后端与用户端前端 (frontend-v2) 混排"),
    # 后端代码 与 管理端前端
    ({"backend_db", "backend_core"}, {"admin_frontend"}, "后端与管理端前端 (admin-frontend) 混排"),
    # 双前端混排
    ({"frontend_v2"}, {"admin_frontend"}, "用户端前端 (frontend-v2) 与管理端前端 (admin-frontend) 混排"),
    # 业务代码 与 独立文档规划
    ({"backend_db", "backend_core", "frontend_v2", "admin_frontend"}, {"docs"}, "生产业务代码与文档待办 (docs/) 混排"),
    # 业务代码 与 Agent/技能体系
    ({"backend_db", "backend_core", "frontend_v2", "admin_frontend"}, {"agent_infra"}, "生产业务代码与 Agent 规则/技能配置 (.agents/) 混排"),
]


def validate_bucket_domains(bucket: Dict[str, Any], idx: int) -> Tuple[bool, str]:
    """校验单个 Bucket 是否违反跨领域原子提交规范。"""
    if bucket.get("allow_mixed", False):
        return True, ""

    files = bucket.get("files", [])
    if not files:
        return True, ""

    domain_file_map: Dict[str, List[str]] = {}
    for f in files:
        d = classify_domain(f)
        domain_file_map.setdefault(d, []).append(f)

    active_domains: Set[str] = set(domain_file_map.keys()) - {"other", "api_schema"}

    for set_a, set_b, reason in INCOMPATIBLE_DOMAIN_PAIRS:
        matched_a = set_a & active_domains
        matched_b = set_b & active_domains
        if matched_a and matched_b:
            err = (
                f"❌ [原子提交守门拦截] Bucket #{idx + 1} 违反默认分组提交规范：{reason}！\n"
                f"   涉及领域: {', '.join(sorted(active_domains))}\n"
                f"   涉及文件分布:\n"
            )
            for d in sorted(active_domains):
                sample_files = domain_file_map.get(d, [])[:3]
                more_suffix = f"...(共{len(domain_file_map.get(d, []))}个)" if len(domain_file_map.get(d, [])) > 3 else ""
                err += f"     - [{d}]: {', '.join(sample_files)}{more_suffix}\n"
            err += (
                "   规则要求：默认必须分组提交，严禁将跨领域的大量变更混在同一个 Commit 中。\n"
                "   请将该 Bucket 拆分为独立的分组分别提交；若确有强耦合需原子混提，请在当前 bucket 中显式声明 \"allow_mixed\": true。"
            )
            return False, err

    return True, ""


def sync_remote(repo: str) -> Tuple[bool, str]:
    """提交前拉取最新远程提交，避免基于陈旧基线提交导致冲突。"""
    # 检查是否有 remote upstream
    rc, upstream, _ = _run(["git", "rev-parse", "--abbrev-ref", "@{u}"], cwd=repo)
    if rc != 0 or not upstream:
        rc_remote, remotes, _ = _run(["git", "remote"], cwd=repo)
        if rc_remote != 0 or "origin" not in remotes.split():
            return True, "未配置远程仓库或 tracking upstream，跳过前置拉取"
        rc_branch, branch, _ = _run(["git", "rev-parse", "--abbrev-ref", "HEAD"], cwd=repo)
        if rc_branch != 0 or branch == "HEAD":
            return True, "detached HEAD，跳过前置拉取"
        upstream = f"origin/{branch}"

    # 1. 尝试静默 fetch
    fetch_rc, _, fetch_err = _run(["git", "fetch", "--quiet"], cwd=repo)
    if fetch_rc != 0:
        return False, f"git fetch 失败: {fetch_err}"

    # 2. 检查本地与远程分叉情况
    rc_rev, count_str, _ = _run(
        ["git", "rev-list", "--left-right", "--count", f"HEAD...{upstream}"], cwd=repo
    )
    if rc_rev == 0 and count_str:
        parts = count_str.split()
        if len(parts) == 2:
            ahead, behind = int(parts[0]), int(parts[1])
            if behind > 0:
                # 远端有新提交，使用 autostash 执行 pull --rebase
                pull_rc, pull_out, pull_err = _run(
                    ["git", "pull", "--rebase", "--autostash"], cwd=repo
                )
                if pull_rc != 0:
                    return False, f"git pull --rebase --autostash 失败: {pull_err or pull_out}"
                return True, f"已成功拉取远端 {behind} 个最新提交并完成 rebase 对齐"
            return True, "本地基线已是最新（behind=0）"

    # 若无法精确计算，直接尝试 pull --rebase --autostash
    pull_rc, pull_out, pull_err = _run(["git", "pull", "--rebase", "--autostash"], cwd=repo)
    if pull_rc != 0:
        return False, f"git pull --rebase 失败: {pull_err or pull_out}"
    return True, "远程同步完成"


def process_buckets(payload: Dict[str, Any], repo: str) -> Dict[str, Any]:
    """核心处理逻辑：逐 bucket add → verify → commit/push，返回报告。"""
    # 当前分支
    rc, branch_name, _ = _run(["git", "rev-parse", "--abbrev-ref", "HEAD"], cwd=repo)
    branch_name = branch_name if rc == 0 else "unknown"

    buckets = payload.get("buckets", [])
    should_push = payload.get("push", False)
    # 受保护分支推送需用户在载荷中显式授权（配合 SKILL.md「冲突处理」策略）
    allow_protected_push = payload.get("push_to_protected", False)
    sync_before = payload.get("sync_before_commit", True)

    # Step 0: 前置全局防呆校验（静态跨领域审计，执行任何 git 操作前全部拦截）
    for idx, bucket in enumerate(buckets):
        valid, err_msg = validate_bucket_domains(bucket, idx)
        if not valid:
            return {
                "branch": branch_name,
                "status": "error",
                "message": err_msg,
                "buckets": [],
                "push": {"enabled": should_push, "status": "skipped", "message": "前置跨领域校验失败，未执行任何提交"},
            }

    # Step 0.5: 前置拉取最新远端提交（防冲突）
    sync_message = "跳过前置拉取"
    if sync_before:
        sync_ok, sync_msg = sync_remote(repo)
        sync_message = sync_msg
        if not sync_ok:
            return {
                "branch": branch_name,
                "status": "error",
                "message": f"❌ [前置远端同步失败] 提交前拉取最新提交中断: {sync_msg}。请先手动处置冲突后再试。",
                "buckets": [],
                "push": {"enabled": should_push, "status": "skipped", "message": "前置同步失败，未执行提交"},
            }

    results: List[Dict[str, Any]] = []
    any_success = False

    for idx, bucket in enumerate(buckets):
        files = bucket.get("files", [])
        verify_cmds = bucket.get("verify_cmds", [])
        commit_message = bucket.get("commit_message", "").strip()

        if not files:
            continue

        bucket_report: Dict[str, Any] = {
            "index": idx,
            "files": files,
            "commit_message": commit_message,
            "verify_passed": True,
            "verify_errors": [],
            "status": "pending",
        }

        # Step A: Git Add
        add_rc, _, add_err = _run(["git", "add", "-A", "--"] + files, cwd=repo)
        if add_rc != 0:
            bucket_report["status"] = "failed"
            bucket_report["verify_passed"] = False
            bucket_report["verify_errors"].append(f"git add 失败: {add_err}")
            results.append(bucket_report)
            continue

        # Step B: Run Verify Commands
        for cmd in verify_cmds:
            if not cmd.strip():
                continue
            # 防呆：若执行前端测试未带 --run，vitest 默认处于 watch 模式会导致进程挂起，自动追加单次运行参数
            normalized_cmd = cmd
            if "pnpm test" in cmd and "--run" not in cmd and "vitest" not in cmd:
                normalized_cmd = cmd.replace("pnpm test", "pnpm test -- --run")
            elif "vitest" in cmd and "run" not in cmd and "--run" not in cmd:
                normalized_cmd = cmd.replace("vitest", "vitest run")

            cmd_rc, cmd_out, cmd_err = _run_shell(normalized_cmd, cwd=repo)
            if cmd_rc != 0:
                bucket_report["verify_passed"] = False
                error_msg = f"命令 '{normalized_cmd}' 失败 (exit={cmd_rc}).\nStdout: {cmd_out}\nStderr: {cmd_err}"
                bucket_report["verify_errors"].append(error_msg)

        # Step C: Commit or Rollback Add
        if not bucket_report["verify_passed"]:
            # 验证失败，仅回滚本次 add 的文件（不影响用户其它暂存）
            _run(["git", "restore", "--staged", "--"] + files, cwd=repo)
            bucket_report["status"] = "failed"
        else:
            # 验证通过，执行 commit（用临时文件保证多行与字符集安全）
            temp_msg_file = os.path.abspath(os.path.join(repo, ".git-auto-suite-commit.tmp"))
            try:
                with open(temp_msg_file, "w", encoding="utf-8") as f:
                    f.write(commit_message)

                commit_rc, commit_out, commit_err = _run(
                    ["git", "commit", "-F", temp_msg_file], cwd=repo
                )
            finally:
                if os.path.exists(temp_msg_file):
                    os.remove(temp_msg_file)

            if commit_rc != 0:
                _run(["git", "restore", "--staged", "--"] + files, cwd=repo)
                bucket_report["status"] = "failed"
                err_detail = commit_err.strip() or commit_out.strip()
                bucket_report["verify_errors"].append(f"git commit 失败: {err_detail}")
            else:
                rc_sha, sha, _ = _run(["git", "rev-parse", "HEAD"], cwd=repo)
                bucket_report["status"] = "committed"
                bucket_report["commit_sha"] = sha if rc_sha == 0 else ""
                any_success = True

        results.append(bucket_report)

    # 执行最终推送
    push_report = {
        "enabled": should_push,
        "protected_branch_authorized": allow_protected_push,
        "status": "skipped",
        "message": "",
    }
    if should_push and any_success:
        if branch_name in PROTECTED_BRANCHES and not allow_protected_push:
            push_report["status"] = "failed"
            push_report["message"] = (
                f"拒绝向受保护分支 '{branch_name}' 执行 Push 操作；"
                "如用户已明确授权，请在载荷中显式设置 push_to_protected: true"
            )
        else:
            # 仅普通 push；分叉/冲突交给 SKILL.md「冲突处理」策略，禁止强推或自动取舍
            push_rc, _, push_err = _run(["git", "push"], cwd=repo)
            if push_rc == 0:
                push_report["status"] = "success"
                push_report["message"] = "已成功推送到远程仓库（双远端拓扑已同步）"
            else:
                push_report["status"] = "failed"
                push_report["message"] = (
                    f"git push 失败（可能远端领先或存在冲突）: {push_err}。"
                    "请先 git fetch 并用 git ls-remote 核对所有 push url，再按 SKILL.md「冲突处理」"
                    "默认策略逐文件合并双方改动、重跑受影响桶的 verify_cmds 后重试；"
                    "存疑项记录并统一咨询用户，禁止强推。"
                )

    return {
        "branch": branch_name,
        "status": "success" if any_success else "partial_or_failed",
        "remote_sync": sync_message,
        "buckets": results,
        "push": push_report,
    }


def main() -> int:
    for stream in (sys.stdout, sys.stderr):
        reconfigure = getattr(stream, "reconfigure", None)
        if callable(reconfigure):
            reconfigure(encoding="utf-8", errors="replace")

    parser = argparse.ArgumentParser(
        prog="execute.py",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        description="""
================================================================================
🚀 git-auto-suite 执行器 —— 默认分组提交与原子校验自动化套件
================================================================================

【核心机制】
  1. 默认原子分组提交（分桶机制）：
     严禁跨领域大杂烩提交！内置跨领域防呆守卫，拦截前后端混排、业务代码与文档混排、
     代码与 Agent 规则配置混排等违规提交，确保每次提交职责内聚、清晰可追溯。
  2. 独立门禁验证 (verify_cmds)：
     每个 Bucket 在执行 commit 前按顺序运行专属验证命令（如 lint、typecheck、pytest 等）。
     全部验证命令退出码为 0 时才生成提交；任一失败自动回滚该桶暂存区并终止，零污染代码。
  3. 规范化 Conventional Commits：
     强制使用简体中文撰写提交说明（格式: <type>(<scope>): <中文描述> 或 <type>: <中文描述>）。
  4. 健壮传参设计：
     --input 参数支持直接传入 JSON 字符串，亦支持传入本地 JSON 文件路径（避免引号转义问题）。
""",
        epilog="""
--------------------------------------------------------------------------------
📋 输入载荷结构说明 (JSON Schema 规范):
--------------------------------------------------------------------------------
根对象属性：
  • buckets (必填, Array[Object]): 待提交的原子分组列表。
      - files (必填, Array[str]): 属于同一内聚领域的文件路径清单（相对于 repo 根目录）。
      - commit_message (必填, str): Conventional Commits 格式中文提交信息。
      - verify_cmds (可选, Array[str]): 独立门禁验证命令，全部执行成功才允许提交。
      - allow_mixed (可选, bool): 是否豁免跨领域检查（默认 false，严禁随意开启）。
  • push (可选, bool): 所有 Bucket 提交成功后是否自动执行 git push（默认 false）。
  • push_to_protected (可选, bool): 用户显式授权向 main/master/develop 执行普通 git push 时置 true（默认 false，拒绝推送；绝不强推）。

* 规范定义详见: input.schema.json (与本脚本同目录)
* 完整使用指南: SKILL.md (与本脚本同目录)

--------------------------------------------------------------------------------
💡 常用调用示例:
--------------------------------------------------------------------------------
1. 基础环境预检 (Preflight):
   $ python3 .agents/skills/infra-git-auto-suite/execute.py --preflight

2. 通过 JSON 配置文件传参执行提交 (推荐，免引号转义):
   $ cat << 'EOF' > plan.json
   {
     "buckets": [
       {
         "files": [
           "tilo-backend-app/backend/routers/case.py",
           "tilo-backend-app/backend/tests/test_case.py"
         ],
         "verify_cmds": [
           "ruff check tilo-backend-app/backend/routers/case.py",
           "cd tilo-backend-app/backend && ../../.venv/bin/pytest tests/test_case.py"
         ],
         "commit_message": "feat(backend): 增加案件详情聚合查询接口"
       },
       {
         "files": [
           "frontend-v2/src/app/(main)/cases/page.tsx"
         ],
         "verify_cmds": [
           "cd frontend-v2 && pnpm typecheck"
         ],
         "commit_message": "feat(frontend): 案件列表页接入最新聚合数据源"
       }
     ],
     "push": false
   }
   EOF
   $ python3 .agents/skills/infra-git-auto-suite/execute.py --input plan.json

3. 针对子仓库执行提交 (如 frontend-v2):
   $ python3 .agents/skills/infra-git-auto-suite/execute.py --repo frontend-v2 --input plan.json

4. 指定报告输出路径:
   $ python3 .agents/skills/infra-git-auto-suite/execute.py --input plan.json --report /tmp/report.json
================================================================================
"""
    )
    parser.add_argument(
        "--input",
        type=str,
        required=False,
        help="JSON 输入载荷。支持：① JSON 字符串；② 本地文件路径（如 plan.json 或 @plan.json，推荐）。格式详见 input.schema.json"
    )
    parser.add_argument(
        "--preflight",
        action="store_true",
        help="本地运行环境快速预检。探测并输出 Python 解释器绝对路径、虚拟环境及 pytest 就绪状态后直接退出"
    )
    parser.add_argument(
        "--repo",
        type=str,
        default=".",
        help="Git 目标仓库根目录路径。支持针对当前主仓或子模块仓执行操作（默认: 当前工作目录 '.'）"
    )
    parser.add_argument(
        "--report",
        type=str,
        default="./git-auto-suite-report.json",
        help="执行结果与审计报告输出文件路径（默认: './git-auto-suite-report.json'）"
    )

    if len(sys.argv) == 1:
        parser.print_help()
        return 0

    args = parser.parse_args()

    repo = args.repo

    # Preflight 模式
    if args.preflight:
        return preflight(repo)

    if not args.input:
        parser.error("--input 参数在非 preflight 模式下为必填")

    # 1. 解析 JSON 输入
    raw_input = args.input
    if args.input.startswith("@") or os.path.isfile(args.input):
        filepath = args.input.lstrip("@")
        with open(filepath, "r", encoding="utf-8") as f:
            raw_input = f.read()
    try:
        payload = json.loads(raw_input)
    except json.JSONDecodeError as e:
        print(json.dumps({"status": "error", "message": f"JSON 解析失败: {e}"}, ensure_ascii=False))
        return 1

    # 2. 检查 Git 仓库状态
    rc, stdout, stderr = _run(["git", "rev-parse", "--is-inside-work-tree"], cwd=repo)
    if rc != 0 or stdout != "true":
        print(json.dumps({"status": "error", "message": f"当前目录非 Git 仓库: {stderr}"}, ensure_ascii=False))
        return 1

    # 3. 处理 Buckets
    report_data = process_buckets(payload, repo)

    # 4. 输出报告
    try:
        with open(args.report, "w", encoding="utf-8") as f:
            json.dump(report_data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"[警告] 写入报告文件失败: {e}", file=sys.stderr)

    if report_data.get("status") == "error":
        print(json.dumps({"status": "error", "message": report_data.get("message")}, ensure_ascii=False))
        return 1

    print(json.dumps({"status": "success", "data": report_data}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
