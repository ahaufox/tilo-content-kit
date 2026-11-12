#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
plan_audit_guard.py — 方案与实施计划前置自动化静态审计工具 (增强版)

核心功能：
  1. 结构完备性探测：自动识别并验证待办三件套（spec.md, plan.md, data-model.md, contracts/ 等）；
  2. 源码防腐门禁审计：自动提取方案中提及的源码文件，统计真实物理行数并与架构门禁比对（包含已超标 FAIL 与高危濒临超标 DANGER）；
  3. 文档内部引用死链审计：智能过滤正则表达式与协议，精准探测失效的相对路径；
  4. 复审对账感知：自动探测既有历史审查报告（plan-review.md），提取初审结论与待整改项；
  5. 多格式输出：支持终端高亮、Markdown 报告嵌入片段与 JSON 结构化数据输出。

使用示例：
  python3 plan_audit_guard.py docs/00-7待办/04-混合/146-多仓文档体系与智能体协同治理重构/
  python3 plan_audit_guard.py docs/00-7待办/04-混合/146-多仓文档体系与智能体协同治理重构/ --format=markdown
"""

import re
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
    """自底向上查找 Git 仓库根目录"""
    curr = start_path.resolve()
    while curr != curr.parent:
        if (curr / ".git").exists() or (curr / ".agents").exists():
            return curr
        curr = curr.parent
    return start_path.resolve()


def count_file_lines(file_path: Path) -> int:
    """统计物理文件的行数"""
    if not file_path.is_file():
        return 0
    try:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            return sum(1 for _ in f)
    except Exception:
        return 0


def extract_referenced_code_paths(content: str, repo_root: Path) -> List[Tuple[str, Path]]:
    """从方案文档中通过正则提取提及的源码文件路径"""
    results = []
    seen = set()

    pattern = re.compile(
        r"""(?x)
        (?:(?:file://)?/?[a-zA-Z0-9_\-\./]+(?:frontend-v2|tilo-backend-app|backend|tilo-core-engine)/[a-zA-Z0-9_\-\./]+\.[a-zA-Z0-9]+)|
        (?:`(?:frontend-v2|tilo-backend-app|backend|tilo-core-engine)/[a-zA-Z0-9_\-\./]+\.[a-zA-Z0-9]+`)|
        (?:\[.*?\]\(((?:frontend-v2|tilo-backend-app|backend|tilo-core-engine)/[a-zA-Z0-9_\-\./]+\.[a-zA-Z0-9]+)\))
        """
    )

    for match in pattern.finditer(content):
        raw = match.group(0).strip("`").strip()
        link_m = re.match(r"\[.*?\]\((.*?)\)", raw)
        if link_m:
            raw = link_m.group(1)
        raw = raw.replace("file://", "")
        try:
            p = Path(raw)
            if p.is_absolute():
                if str(p).startswith(str(repo_root)):
                    p = p.relative_to(repo_root)
            raw_str = str(p).lstrip("/")
        except Exception:
            raw_str = raw

        if any(raw_str.endswith(ext) for ext in [".ts", ".tsx", ".py", ".js", ".jsx", ".css", ".sql"]):
            if raw_str not in seen:
                seen.add(raw_str)
                abs_path = (repo_root / raw_str).resolve()
                results.append((raw_str, abs_path))

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
            "total_files_audited": 0
        }
    }

    # 1. 结构完备性探测
    if is_dir:
        expected_docs = {
            "spec.md": "需求规格说明书 (Spec)",
            "plan.md": "技术实施方案 (Plan)",
            "data-model.md": "数据模型与状态机契约 (Data Model)",
            "contracts": "契约接口目录 (Contracts)",
            "quickstart.md": "快速启动与验证规范 (Quickstart)",
            "research.md": "技术调研与决策备忘 (Research)"
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
            elif not exists and doc_name in ["data-model.md", "contracts"]:
                report["summary"]["warnings_count"] += 1

        # 检查是否存在历史审查报告
        prior_review_p = plan_dir / "plan-review.md"
        if not prior_review_p.exists():
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

    return report


def format_markdown_report(data: Dict[str, Any]) -> str:
    """将审计结果格式化为嵌入审查报告的精简 Markdown 片段。

    输出以异常驱动：全绿时仅输出一行汇总；仅缺失/超标/断链等异常存在时展开对应明细，
    齐全项不再逐行铺陈，控制嵌入审查报告与对话的体积。
    """
    s = data["summary"]
    lines = []
    lines.append(
        f"### 前置审计 (Plan Audit Guard): 阻断 {s['blockers_count']} / 高危 {s['danger_count']} / 警告 {s['warnings_count']} / 引用源码 {s['total_files_audited']} 个"
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
