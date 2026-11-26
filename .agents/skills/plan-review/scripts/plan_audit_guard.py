#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
plan_audit_guard.py — 方案与实施计划前置自动化静态审计工具 (增强版)

核心功能：
  1. 结构完备性探测：自动识别并验证待办三件套（spec.md, plan.md, tasks.md）；
  2. 源码防腐门禁审计：自动提取方案中提及的源码文件，统计真实物理行数并与架构门禁比对（包含已超标 FAIL 与高危濒临超标 DANGER）；
  3. 文档内部引用死链审计：智能过滤正则表达式与协议，精准探测失效的相对路径；
  4. 复审对账感知：自动探测既有历史审查报告（plan-review.md），提取初审结论与待整改项；
  5. 多格式输出：支持终端高亮、Markdown 报告嵌入片段与 JSON 结构化数据输出。

使用示例：
  python3 plan_audit_guard.py docs/00-7待办/04-混合/146-多仓文档体系与智能体协同治理重构/
  python3 plan_audit_guard.py docs/00-7待办/04-混合/146-多仓文档体系与智能体协同治理重构/ --format=markdown
"""

import re
import os
import sys
import json
import argparse
from pathlib import Path
from urllib.parse import unquote
from typing import Dict, List, Any, Tuple


# 项目全局行数门禁标准（定义于 global-standards.md 与全栈防腐分析）
LINE_THRESHOLDS: Dict[str, Dict[str, Any]] = {
    "page": {"limit": 250, "pattern": re.compile(r"page\.(tsx|jsx|js|ts)$")},
    "component": {"limit": 500, "pattern": re.compile(r"(Panel|Drawer|Dialog|Pane|Modal|Workbench|Card|View)\.(tsx|jsx)$")},
    "hook": {"limit": 350, "pattern": re.compile(r"use[A-Z0-9].*\.(ts|tsx|js|jsx)$")},
    "backend_module": {"limit": 600, "pattern": re.compile(r"\.py$")},
    "general_frontend": {"limit": 600, "pattern": re.compile(r"\.(tsx|jsx|ts|js)$")},
}


def find_repo_root(start_path: Path) -> Path:
    """自底向上查找 Git 仓库根目录。

    `.git` 优先：子仓（如 frontend-v2）自带 `.git` 文件时即为其仓库根；
    `.agents` 仅在没有 `.git` 的情况下作为兜底标记，避免规则/技能镜像目录导致提前返回。
    """
    curr = start_path.resolve()
    agents_hit: Path | None = None
    while curr != curr.parent:
        if (curr / ".git").exists():
            return curr
        if agents_hit is None and (curr / ".agents").exists():
            agents_hit = curr
        curr = curr.parent
    return agents_hit if agents_hit is not None else start_path.resolve()


# 已知子仓名（用于路径剥离与候选基址推导）
SUBREPO_NAMES = ("frontend-v2", "tilo-backend-app", "tilo-core-engine", "admin-frontend", "prod-dev-ops")


def _module_test_roots(repo_root: Path) -> List[Path]:
    """收集子仓内直接包含 `tests/` 目录的模块根，用于解析模块相对写法的 `tests/...` 引用。

    方案文档常以「进入模块目录后执行」的相对路径书写测试文件（如
    `tests/test_master_copilot_evidence_directory_prompt.py`），这类路径在仓库根
    无法定位，需以各模块根为候选基址重试。
    """
    roots: List[Path] = []
    skip_dirs = {
        ".git", ".venv", "node_modules", "__pycache__", "dist", "build",
        ".mypy_cache", ".pytest_cache", ".ruff_cache", "coverage", ".next",
    }
    for name in ("tilo-core-engine", "tilo-backend-app", "admin-frontend"):
        sub = repo_root / name
        if not sub.is_dir():
            continue
        for current, dirnames, _ in os.walk(sub):
            dirnames[:] = [d for d in dirnames if d not in skip_dirs]
            if "tests" in dirnames:
                roots.append(Path(current))
    return roots


def _draft_version_key(path: Path) -> Tuple[int, int]:
    """按版本/编号排序审查底稿：`plan-review-2.0.md` > `plan-review-1.9.md` > `plan-review.md`。"""
    match = re.search(r"(\d+)(?:\.(\d+))?", path.stem)
    if not match:
        return (-1, -1)
    return (int(match.group(1)), int(match.group(2) or 0))


def count_file_lines(file_path: Path) -> int:
    """统计物理文件的行数"""
    if not file_path.is_file():
        return 0
    try:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            return sum(1 for _ in f)
    except Exception:
        return 0


def _candidate_bases(repo_root: Path) -> List[Path]:
    """候选解析基址：仓库根 → 主仓根（父目录）→ 各子仓根 → 子仓服务根 → SDK 子仓根。"""
    bases: List[Path] = [repo_root]
    parent = repo_root.parent
    if parent != repo_root:
        bases.append(parent)
    for name in SUBREPO_NAMES:
        child = repo_root / name
        if child.is_dir():
            bases.append(child)
            # 服务根（如 tilo-backend-app/backend）用于解析裸 `tests/...` 写法
            for service_root in ("backend", "app"):
                if (child / service_root).is_dir():
                    bases.append(child / service_root)
    for sdk_root in (repo_root / "sdks", parent / "sdks"):
        if sdk_root.is_dir():
            for sdk_child in sorted(sdk_root.iterdir()):
                if sdk_child.is_dir():
                    bases.append(sdk_child)
    bases.extend(_module_test_roots(repo_root))
    return bases


def _resolve_referenced_path(raw: str, repo_root: Path) -> Tuple[str, Path]:
    """在候选基址下解析引用路径，返回 (门禁判定用相对路径, 绝对路径)。

    兼容两种书写形态：
      - 主仓写法 `frontend-v2/src/...`
      - 子仓写法 `src/...`（相对 frontend-v2 仓库根）
    """
    raw_l = raw.lstrip("/")
    parts = Path(raw_l).parts
    stripped: str | None = None
    if parts and parts[0] in SUBREPO_NAMES:
        stripped = str(Path(*parts[1:]))

    fallback: Tuple[str, Path] | None = None
    for base in _candidate_bases(repo_root):
        for rel in ([raw_l] + ([stripped] if stripped else [])):
            abs_path = base / rel
            if abs_path.is_file():
                resolved = abs_path.resolve()
                try:
                    rel_out = str(resolved.relative_to(repo_root))
                except ValueError:
                    rel_out = rel
                return rel_out, resolved
            if fallback is None:
                fallback = (rel, abs_path)
    return fallback if fallback is not None else (raw_l, repo_root / raw_l)


def extract_referenced_code_paths(content: str, repo_root: Path) -> List[Tuple[str, Path]]:
    """从方案文档中通过正则提取提及的源码文件路径。

    路径书写形态兼容：
      - 主仓写法 `frontend-v2/src/...`、`tilo-backend-app/backend/...`
      - 子仓写法 `src/...`、`tests/...`、`sdks/...`
    """
    results = []
    seen = set()

    # 路径字符类需覆盖 React Router 约定：并行路由段 `(main)` 与动态段 `[id]`，
    # 否则 `frontend-v2/src/app/(main)/cases/[id]/...` 一律无法被识别。
    _SEG = r"[a-zA-Z0-9_\-\./()\[\]]"
    pattern = re.compile(
        rf"""(?x)
        (?P<path>
            (?:file://)?/?{_SEG}*
            (?:frontend-v2|tilo-backend-app|backend|tilo-core-engine|admin-frontend|prod-dev-ops)
            /{_SEG}+\.[a-zA-Z0-9]+
          |
            (?:src|tests|sdks|scripts)/{_SEG}+\.[a-zA-Z0-9]+
        )
        """
    )

    for match in pattern.finditer(content):
        raw = match.group("path").strip("`").strip()
        raw = raw.replace("file://", "")

        rel_str, abs_path = _resolve_referenced_path(raw, repo_root)

        if any(rel_str.endswith(ext) for ext in [".ts", ".tsx", ".py", ".js", ".jsx", ".css", ".sql", ".yml", ".yaml", ".json"]):
            if rel_str not in seen:
                seen.add(rel_str)
                results.append((rel_str, abs_path))

    return results


def check_line_threshold(rel_path: str, line_count: int) -> Dict[str, Any]:
    """根据文件类型与行数判定防腐风险等级"""
    file_name = Path(rel_path).name

    # 规范豁免（根据 global-standards.md §7）：
    # 1. 测试用例与夹具不设行数上限
    # 2. 纯契约/数据/资产（types/, schemas/, contracts/）豁免物理行数硬上限，保证 SSOT 集中检索
    if "/__tests__/" in rel_path or "/tests/" in rel_path or file_name.endswith((".test.ts", ".test.tsx", ".spec.ts", ".spec.tsx", ".test.js", ".test.jsx", ".test.py")):
        return {
            "category": "测试用例 (豁免行数)",
            "limit": 999999,
            "status": "PASS",
            "diff": 0
        }

    if "/types/" in rel_path or "/schemas/" in rel_path or "/contracts/" in rel_path or rel_path.endswith((".d.ts", "enums.py")):
        return {
            "category": "契约与类型定义 (豁免行数)",
            "limit": 999999,
            "status": "PASS",
            "diff": 0
        }

    category = "通用源文件"
    limit = 600

    if LINE_THRESHOLDS["page"]["pattern"].search(file_name):
        category = "页面组件 (Page)"
        limit = LINE_THRESHOLDS["page"]["limit"]
    elif LINE_THRESHOLDS["component"]["pattern"].search(file_name):
        category = "业务面板/抽屉 (Panel/Modal)"
        limit = LINE_THRESHOLDS["component"]["limit"]
    elif LINE_THRESHOLDS["hook"]["pattern"].search(file_name):
        category = "自定义 Hook"
        limit = LINE_THRESHOLDS["hook"]["limit"]
    elif LINE_THRESHOLDS["backend_module"]["pattern"].search(file_name):
        category = "后端模块 (Python)"
        limit = LINE_THRESHOLDS["backend_module"]["limit"]
    elif LINE_THRESHOLDS["general_frontend"]["pattern"].search(file_name):
        category = "前端通用组件"
        limit = LINE_THRESHOLDS["general_frontend"]["limit"]

    # 判定分级：
    # FAIL: 已经达到或超过上限 (>= limit)
    # DANGER: 处于高危水位 (>= 90% limit)，严禁原地追加代码
    # WARN: 处于关注水位 (>= 80% limit)
    # PASS: 安全
    if line_count >= limit:
        status = "FAIL"
    elif line_count >= int(limit * 0.90):
        status = "DANGER"
    elif line_count >= int(limit * 0.80):
        status = "WARN"
    else:
        status = "PASS"

    return {
        "category": category,
        "limit": limit,
        "status": status,
        "diff": line_count - limit
    }


def audit_plan_structure(target_path: Path, repo_root: Path) -> Dict[str, Any]:
    """主审计执行器"""
    is_dir = target_path.is_dir()
    plan_dir = target_path if is_dir else target_path.parent
    main_plan_file = target_path if not is_dir else (plan_dir / "plan.md")

    report: Dict[str, Any] = {
        "target_path": str(target_path.relative_to(repo_root) if target_path.is_relative_to(repo_root) else target_path),
        "mode": "feature_directory" if is_dir else "single_file",
        "structure_check": {},
        "referenced_files": [],
        "line_violations": [],
        "broken_links": [],
        "prior_review": None,
        "summary": {
            "blockers_count": 0,
            "danger_count": 0,
            "warnings_count": 0,
            "total_files_audited": 0,
            "unresolved_count": 0
        }
    }

    # 1. 结构完备性探测（固定三件套模型：spec.md / plan.md / tasks.md）
    if is_dir:
        expected_docs = {
            "spec.md": "需求规格 (Spec)",
            "plan.md": "实施方案 (Plan)",
            "tasks.md": "任务与验收清单 (Tasks & AC)",
        }
        for doc_name, desc in expected_docs.items():
            doc_p = plan_dir / doc_name
            exists = doc_p.exists()
            report["structure_check"][doc_name] = {
                "description": desc,
                "exists": exists,
                "path": str(doc_p.relative_to(repo_root) if doc_p.is_relative_to(repo_root) else doc_p)
            }
            if not exists and doc_name in ["spec.md", "plan.md"]:
                report["summary"]["blockers_count"] += 1

        # 检查是否存在历史审查报告
        # 优先单一 SSOT `plan-review.md`；缺失时回退到版本化底稿（plan-review-{x}.md）最新者，
        # 以兼容按版本化命名产出底稿的审查流程。
        prior_review_p = plan_dir / "plan-review.md"
        if not prior_review_p.exists():
            versioned_drafts = sorted(plan_dir.glob("plan-review-*.md"))
            if versioned_drafts:
                prior_review_p = max(versioned_drafts, key=_draft_version_key)
            else:
                prior_review_p = plan_dir / "review-report.md"
        if prior_review_p.exists():
            report["prior_review"] = {
                "exists": True,
                "path": str(prior_review_p.relative_to(repo_root) if prior_review_p.is_relative_to(repo_root) else prior_review_p)
            }

    # 2. 读取方案内容并提取被提及的源码路径与死链排查
    all_content = ""
    docs_to_scan = [main_plan_file]
    if is_dir:
        for md_file in plan_dir.glob("**/*.md"):
            # 排除生成的审查报告与历史对账报告自身，防止报告引用循环干扰
            if md_file.is_file() and not (
                md_file.name.startswith("plan-review") or md_file.name.startswith("review-report")
            ):
                docs_to_scan.append(md_file)

    scanned_md_paths = set()
    for md in docs_to_scan:
        if md.exists() and md not in scanned_md_paths:
            scanned_md_paths.add(md)
            try:
                with open(md, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()
                    all_content += "\n" + content

                    # 探测本地相对死链
                    for link_match in re.finditer(r"\[([^\]]+)\]\(([^)]+)\)", content):
                        raw_link = link_match.group(2).strip()
                        # 过滤非文件链接与特殊语法
                        if any(raw_link.startswith(prefix) for prefix in ["http://", "https://", "#", "mailto:", "citation:"]):
                            continue
                        if raw_link in ["url", "...", "http", "https"]:
                            continue
                        if any(c in raw_link for c in ["?", "*", "\\", "..", "..."]) and not raw_link.startswith("../"):
                            continue

                        # 处理 file:// 绝对路径
                        if raw_link.startswith("file://"):
                            clean_abs = unquote(raw_link.replace("file://", "")).split("#")[0]
                            resolved_link = Path(clean_abs)
                        else:
                            clean_rel = unquote(raw_link.split("#")[0])
                            resolved_link = (md.parent / clean_rel).resolve()

                        if not resolved_link.exists():
                            report["broken_links"].append({
                                "source_doc": str(md.relative_to(repo_root) if md.is_relative_to(repo_root) else md),
                                "link_text": link_match.group(1),
                                "target_link": raw_link
                            })
            except Exception:
                pass

    # 3. 审计被引用的源码文件行数门禁
    ref_files = extract_referenced_code_paths(all_content, repo_root)
    report["summary"]["total_files_audited"] = len(ref_files)

    for rel_path, abs_path in ref_files:
        exists = abs_path.is_file()
        line_count = count_file_lines(abs_path) if exists else 0
        threshold_info = check_line_threshold(rel_path, line_count)

        item = {
            "path": rel_path,
            "exists": exists,
            "line_count": line_count,
            "category": threshold_info["category"],
            "limit": threshold_info["limit"],
            "status": threshold_info["status"]
        }
        report["referenced_files"].append(item)

        if exists and threshold_info["status"] == "FAIL":
            report["line_violations"].append(item)
            report["summary"]["blockers_count"] += 1
        elif exists and threshold_info["status"] == "DANGER":
            report["line_violations"].append(item)
            report["summary"]["danger_count"] += 1
        elif exists and threshold_info["status"] == "WARN":
            report["summary"]["warnings_count"] += 1

    # 未能在仓库中定位的引用路径单独计数，避免被计入「已审计」口径而静默漏审
    report["summary"]["unresolved_count"] = sum(
        1 for item in report["referenced_files"] if not item["exists"]
    )

    return report


def format_markdown_report(data: Dict[str, Any]) -> str:
    """将审计结果格式化为嵌入审查报告的精简 Markdown 片段。

    输出以异常驱动：全绿时仅输出一行汇总；仅缺失/超标/断链等异常存在时展开对应明细，
    齐全项不再逐行铺陈，控制嵌入审查报告与对话的体积。
    """
    s = data["summary"]
    lines = []
    unresolved = s.get("unresolved_count", 0)
    resolved_suffix = (
        f"（成功解析 {s['total_files_audited'] - unresolved} / 未解析 {unresolved}）"
        if unresolved
        else ""
    )
    lines.append(
        f"### 前置审计 (Plan Audit Guard): 阻断 {s['blockers_count']} / 高危 {s['danger_count']} / 警告 {s['warnings_count']} / 引用源码 {s['total_files_audited']} 个{resolved_suffix}"
    )

    if unresolved:
        lines.append(
            f"- ⚠️ 有 {unresolved} 条引用路径未能在仓库中定位，已排除出审计范围，需人工核对"
        )

    if data.get("prior_review"):
        prior_path = data["prior_review"]["path"]
        lines.append(f"- 触发二审模式: 已存在历史审查报告 `{prior_path}`")

    if data["structure_check"]:
        missing = [
            name
            for name, item in data["structure_check"].items()
            if not item["exists"]
        ]
        if missing:
            lines.append(f"- 文档完备性: 缺失 `{', '.join(missing)}`")
        else:
            lines.append(f"- 文档完备性 {len(data['structure_check'])}/{len(data['structure_check'])}")

    if data["line_violations"]:
        lines.append("")
        lines.append("#### 超标/高危文件（必须提前拆分，严禁原地追加）")
        for v in data["line_violations"]:
            status_tag = "🔴 FAIL" if v["status"] == "FAIL" else "🟠 DANGER"
            lines.append(
                f"- {status_tag} `{v['path']}` — {v['category']} {v['line_count']} 行 (上限 {v['limit']} 行)"
            )

    if data["broken_links"]:
        lines.append("")
        lines.append("#### 断链（计划路径不存在）")
        for bl in data["broken_links"][:10]:
            lines.append(f"- `{bl['source_doc']}` → `{bl['target_link']}`")
        remaining_links = len(data["broken_links"]) - 10
        if remaining_links > 0:
            lines.append(f"- …另有 {remaining_links} 条断链未展开")

    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="方案与实施计划前置自动化静态审计工具")
    parser.add_argument("target", help="目标任务目录或 plan.md 路径")
    parser.add_argument("--format", choices=["text", "markdown", "json"], default="text", help="输出格式")
    args = parser.parse_args()

    target_path = Path(args.target).resolve()
    if not target_path.exists():
        print(f"❌ 错误: 目标路径不存在: {target_path}", file=sys.stderr)
        sys.exit(1)

    repo_root = find_repo_root(target_path)
    report = audit_plan_structure(target_path, repo_root)

    if args.format == "json":
        print(json.dumps(report, ensure_ascii=False, indent=2))
    elif args.format == "markdown":
        print(format_markdown_report(report))
    else:
        print("=" * 68)
        print(" 🔍 方案设计前置静态审计结果 (Plan Audit Guard)")
        print("=" * 68)
        print(f"目标: {report['target_path']}")
        print(f"阻断项: {report['summary']['blockers_count']} | 高危越界: {report['summary']['danger_count']} | 警告项: {report['summary']['warnings_count']}")
        if report.get("prior_review"):
            print(f"历史审查: 发现既有审查报告 -> {report['prior_review']['path']}")
        print("-" * 68)

        if report["structure_check"]:
            missing = [k for k, v in report["structure_check"].items() if not v["exists"]]
            if missing:
                print("【文档完备性缺失】")
                for k in missing:
                    print(f"  ❌ {k:15} - {report['structure_check'][k]['description']}")
            else:
                total = len(report["structure_check"])
                print(f"【文档完备性】{total}/{total} 全备")
            print("-" * 68)

        if report["line_violations"]:
            print("【🔴 防腐门禁高危/超标文件】(计划修改前必须规划拆分解耦！)")
            for v in report["line_violations"]:
                status_label = "FAIL" if v["status"] == "FAIL" else "DANGER (≥90%)"
                print(f"  ⚠️  [{status_label}] {v['path']} -> 当前 {v['line_count']} 行 (上限 {v['limit']} 行, 类别: {v['category']})")
            print("-" * 68)

        if report["broken_links"]:
            print("【⚠️ 文档内部断链】")
            for bl in report["broken_links"]:
                print(f"  🔗 {bl['source_doc']} -> 目标 '{bl['target_link']}' 不存在")
            print("-" * 68)

        print("审计完成。")


if __name__ == "__main__":
    main()
