#!/usr/bin/env python3
"""
plan_review_helper.py — plan-review 审查报告解析、核查与对账辅助工具

核心功能：
  1. 结构化解析：自动提取 plan-review.md 中的审查结论、核销头部与所有问题条目（含阻断/警告/建议级别、当前状态、证据、调整建议）；
  2. 真实基线核查：自动探测证据引用的文件与行号，在代码库真实存在性检测与行内容切片；
  3. 整改状态统计：统计问题清单的整改闭环率，辅助生成核销头部与对账总结。

使用示例：
  python3 plan_review_helper.py parse <path_to_plan_review.md> [--format=json|table]
  python3 plan_review_helper.py verify <path_to_plan_review.md>
  python3 plan_review_helper.py status <path_to_plan_review.md>
"""

import argparse
import json
import re
from pathlib import Path
from typing import Any


def find_repo_root(start_path: Path) -> Path:
    """自底向上查找工作区顶层主仓根目录"""
    # 优先检查当前工作目录是否为主仓
    cwd = Path.cwd().resolve()
    if (cwd / "frontend-v2").is_dir() and (cwd / "tilo-backend-app").is_dir():
        return cwd

    curr = start_path.resolve()
    topmost_root = curr
    while curr != curr.parent:
        if (curr / "frontend-v2").is_dir() and (curr / "tilo-backend-app").is_dir():
            return curr
        if (curr / ".git").exists():
            topmost_root = curr
        curr = curr.parent
    return topmost_root


class PlanReviewItem:
    def __init__(
        self,
        index: str,
        title: str,
        severity: str,
        status: str,
        evidence_raw: str,
        recommendation_raw: str,
        resolution_raw: str = "",
        raw_block: str = "",
    ):
        self.index = index
        self.title = title
        self.severity = severity  # 🔴阻断 / 🟡警告 / 🟢建议 / ℹ️提示 / 未知
        self.status = status      # 未整改 / 部分解决 / 已整改 / 豁免 / 新增
        self.evidence_raw = evidence_raw
        self.recommendation_raw = recommendation_raw
        self.resolution_raw = resolution_raw
        self.raw_block = raw_block
        self.extracted_locations: list[tuple[str, int | None]] = []
        self._extract_locations()

    def _extract_locations(self) -> None:
        """从证据文本中提取形如 `path/to/file.ext:123` 或 `path/to/file.ext` 的文件位置"""
        # 匹配反引号内的文件路径：`frontend-v2/docs/00-待办/.../quickstart.md:38`
        # 兼容中文路径、英文路径及行号
        backtick_pattern = re.compile(
            r"`([^`\n\r\t]+?\.[a-zA-Z0-9_\-]+(?::\d+)?)`"
        )
        for match in backtick_pattern.finditer(self.evidence_raw):
            raw = match.group(1).strip()
            # 过滤包含空格的命令字符串（如 `vitest run ...`）
            if " " in raw:
                continue
            if ":" in raw:
                path_part, line_part = raw.rsplit(":", 1)
                line = int(line_part) if line_part.isdigit() else None
            else:
                path_part = raw
                line = None
            if "/" in path_part or path_part.endswith((".ts", ".tsx", ".py", ".md", ".json", ".sh", ".yml", ".yaml")):
                self.extracted_locations.append((path_part, line))

        # 若反引号未提取到，使用宽松正则提取普通文本中的路径
        if not self.extracted_locations:
            pattern = re.compile(
                r"([a-zA-Z0-9_\-\.\/\u4e00-\u9fa5]+\.[a-zA-Z0-9_\-]+)(?::(\d+))?"
            )
            for match in pattern.finditer(self.evidence_raw):
                raw_path = match.group(1).strip("`'\"")
                if " " in raw_path:
                    continue
                line_str = match.group(2)
                if "/" not in raw_path and not raw_path.endswith((".ts", ".tsx", ".py", ".md", ".json", ".sh", ".yml", ".yaml")):
                    continue
                if raw_path.startswith(("http://", "https://")):
                    continue
                line = int(line_str) if line_str else None
                self.extracted_locations.append((raw_path, line))

    def to_dict(self) -> dict[str, Any]:
        return {
            "index": self.index,
            "title": self.title,
            "severity": self.severity,
            "status": self.status,
            "evidence": self.evidence_raw,
            "recommendation": self.recommendation_raw,
            "resolution": self.resolution_raw,
            "locations": [
                {"path": p, "line": l} for p, l in self.extracted_locations
            ],
        }


class PlanReviewDocument:
    def __init__(self, file_path: Path):
        self.file_path = file_path.resolve()
        self.repo_root = find_repo_root(self.file_path)
        self.content = ""
        self.title = ""
        self.conclusion = ""
        self.reconciliation = ""
        self.items: list[PlanReviewItem] = []
        self._load_and_parse()

    def _load_and_parse(self) -> None:
        if not self.file_path.exists():
            raise FileNotFoundError(f"文件不存在: {self.file_path}")
        with open(self.file_path, "r", encoding="utf-8", errors="ignore") as f:
            self.content = f.read()

        # 提取顶部标题、结论与核销
        title_match = re.search(r"^#\s+(.+)$", self.content, re.MULTILINE)
        if title_match:
            self.title = title_match.group(1).strip()

        conclusion_match = re.search(r"^结论[:：]\s*(.+)$", self.content, re.MULTILINE)
        if conclusion_match:
            self.conclusion = conclusion_match.group(1).strip()

        reconciliation_match = re.search(r"^核销[:：]\s*(.+)$", self.content, re.MULTILINE)
        if reconciliation_match:
            self.reconciliation = reconciliation_match.group(1).strip()

        # 切分问题清单
        # 支持格式 A: ### 1. [🟡警告][⚠️ 部分解决] ...
        # 支持格式 B: ### Finding 1【重要 · S2/M】...
        # 支持格式 C: ### 1. 问题简述
        sections = re.split(r"\n(?=###\s+)", self.content)
        for sec in sections:
            if not sec.strip().startswith("###"):
                continue
            item = self._parse_section(sec)
            if item:
                self.items.append(item)

    def _parse_section(self, section_text: str) -> PlanReviewItem | None:
        lines = section_text.strip().split("\n")
        header = lines[0].replace("###", "").strip()

        # 解析编号与标题
        # 尝试匹配 "1. [🟡警告][⚠️ 部分解决] 标题" 或 "Finding 1【重要】 标题"
        index = ""
        severity = "🟡警告"
        status = "❌ 未整改"
        title = header

        # 匹配严重级别
        if "🔴" in header or "阻断" in header or "致命" in header or "S1" in header:
            severity = "🔴阻断"
        elif "🟡" in header or "警告" in header or "重要" in header or "S2" in header:
            severity = "🟡警告"
        elif "🟢" in header or "建议" in header or "S3" in header or "轻微" in header:
            severity = "🟢建议"
        else:
            severity = "ℹ️提示"

        # 匹配整改状态
        if "✅" in header or "已整改" in header or "已闭环" in header or "已修复" in header:
            status = "✅ 已整改"
        elif "⚠️" in header or "部分解决" in header or "部分整改" in header:
            status = "⚠️ 部分解决"
        elif "⚪" in header or "豁免" in header or "不适用" in header or "误报" in header:
            status = "⚪ 豁免"
        elif "❌" in header or "未整改" in header:
            status = "❌ 未整改"
        else:
            status = "❌ 未整改"

        # 提取索引与清理标题
        idx_match = re.match(r"^(?:Finding\s+)?(\d+|[A-Za-z0-9_\-]+)[\.、:\s【]", header)
        if idx_match:
            index = idx_match.group(1)
        else:
            index = str(len(self.items) + 1)

        # 清除标题中的状态标记符号以获得纯标题文本
        clean_title = re.sub(r"^(\d+|Finding\s+\d+)[\.、:\s]*", "", header)
        clean_title = re.sub(r"\[[^\]]+\]", "", clean_title)
        clean_title = re.sub(r"【[^】]+】", "", clean_title)
        title = clean_title.strip()

        # 提取证据、建议与处置
        evidence = ""
        recommendation = ""
        resolution = ""

        # 正则提取各字段
        # - 证据: ... / - **证据**：...
        ev_match = re.search(r"[-*]\s*(?:\*\*)?证据(?:\*\*)?[:：]\s*(.+?)(?=\n[-*]|\Z)", section_text, re.DOTALL)
        if ev_match:
            evidence = ev_match.group(1).strip()

        # - 调整建议: ... / - 建议: ... / - 整改: ...
        rec_match = re.search(r"[-*]\s*(?:\*\*)?(?:调整建议|建议|整改|改法)(?:\*\*)?[:：]\s*(.+?)(?=\n[-*]|\Z)", section_text, re.DOTALL)
        if rec_match:
            recommendation = rec_match.group(1).strip()

        # - 处置结果: ... / - 处置: ... / - 结果: ...
        res_match = re.search(r"[-*]\s*(?:\*\*)?(?:处置结果|处置|整改情况|核销说明)(?:\*\*)?[:：]\s*(.+?)(?=\n[-*]|\Z)", section_text, re.DOTALL)
        if res_match:
            resolution = res_match.group(1).strip()

        return PlanReviewItem(
            index=index,
            title=title,
            severity=severity,
            status=status,
            evidence_raw=evidence,
            recommendation_raw=recommendation,
            resolution_raw=resolution,
            raw_block=section_text,
        )

    def to_dict(self) -> dict[str, Any]:
        return {
            "file": str(self.file_path),
            "title": self.title,
            "conclusion": self.conclusion,
            "reconciliation": self.reconciliation,
            "total_items": len(self.items),
            "items": [item.to_dict() for item in self.items],
        }


def cmd_parse(args: argparse.Namespace) -> None:
    doc = PlanReviewDocument(Path(args.path))
    if args.format == "json":
        print(json.dumps(doc.to_dict(), ensure_ascii=False, indent=2))
    else:
        print(f"📄 审查报告: {doc.title or doc.file_path.name}")
        print(f"📊 当前结论: {doc.conclusion or '未注明'}")
        if doc.reconciliation:
            print(f"🔄 既有核销: {doc.reconciliation}")
        print(f"📋 问题总数: {len(doc.items)} 项\n" + "-" * 60)
        for it in doc.items:
            print(f"[{it.index}] {it.severity} [{it.status}] {it.title}")
            if it.evidence_raw:
                short_ev = (it.evidence_raw[:100] + "...") if len(it.evidence_raw) > 100 else it.evidence_raw
                print(f"    证据: {short_ev}")
            if it.recommendation_raw:
                short_rec = (it.recommendation_raw[:100] + "...") if len(it.recommendation_raw) > 100 else it.recommendation_raw
                print(f"    建议: {short_rec}")
            if it.resolution_raw:
                print(f"    处置: {it.resolution_raw}")
            print()


def cmd_verify(args: argparse.Namespace) -> None:
    doc = PlanReviewDocument(Path(args.path))
    repo_root = doc.repo_root
    task_dir = doc.file_path.parent

    print(f"🔍 开始实地核查证据路径: {doc.file_path.name}")
    print(f"根目录基线: {repo_root}\n" + "=" * 60)

    for it in doc.items:
        print(f"\n▶ 检查条目 [{it.index}] {it.severity} {it.title}")
        if not it.extracted_locations:
            print("  ⚠️ 未在证据中提取到确切的文件路径")
            continue

        for rel_path, line in it.extracted_locations:
            # 尝试多路径解析：相对 repo_root，或相对 task_dir
            candidates = [
                repo_root / rel_path,
                task_dir / rel_path,
                Path(rel_path),
            ]
            target_file: Path | None = None
            for c in candidates:
                if c.exists() and c.is_file():
                    target_file = c
                    break

            if not target_file:
                print(f"  ❌ 文件不存在: {rel_path}")
            else:
                exists_tag = "✅ 存在"
                line_info = f"行号: {line}" if line else "无指定行号"
                try:
                    display_path = target_file.resolve().relative_to(repo_root)
                except ValueError:
                    display_path = target_file.resolve()
                print(f"  {exists_tag}: {display_path} ({line_info})")

                if line and target_file.is_file():
                    try:
                        with open(target_file, "r", encoding="utf-8", errors="ignore") as f:
                            all_lines = f.readlines()
                        start = max(0, line - 2)
                        end = min(len(all_lines), line + 3)
                        print("  [代码/文本切片]:")
                        for idx in range(start, end):
                            prefix = "👉" if idx + 1 == line else "  "
                            content_preview = all_lines[idx].rstrip()[:120]
                            print(f"    {prefix} {idx + 1:4d} | {content_preview}")
                    except OSError as e:
                        print(f"    ⚠️ 读取文本切片失败: {e}")


def cmd_status(args: argparse.Namespace) -> None:
    doc = PlanReviewDocument(Path(args.path))
    total = len(doc.items)
    resolved = sum(1 for it in doc.items if "已整改" in it.status)
    partial = sum(1 for it in doc.items if "部分解决" in it.status)
    exempt = sum(1 for it in doc.items if "豁免" in it.status)
    unresolved = sum(1 for it in doc.items if "未整改" in it.status)

    print(f"📊 报告整改闭环率统计: {doc.file_path.name}")
    print(f"总项数: {total}")
    print(f"  ✅ 已整改: {resolved} 项")
    print(f"  ⚠️ 部分解决: {partial} 项")
    print(f"  ⚪ 已豁免: {exempt} 项")
    print(f"  ❌ 未整改: {unresolved} 项")
    if total > 0:
        closed_ratio = (resolved + exempt) / total * 100
        print(f"📈 当前闭环完成度: {closed_ratio:.1f}%")


def main() -> None:
    parser = argparse.ArgumentParser(description="plan-review 审查报告辅助工具")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # parse
    p_parse = subparsers.add_parser("parse", help="解析审查报告")
    p_parse.add_argument("path", help="plan-review.md 文件路径")
    p_parse.add_argument("--format", choices=["table", "json"], default="table", help="输出格式")

    # verify
    p_verify = subparsers.add_parser("verify", help="验证证据引用的文件与行号")
    p_verify.add_argument("path", help="plan-review.md 文件路径")

    # status
    p_status = subparsers.add_parser("status", help="统计整改闭环状态")
    p_status.add_argument("path", help="plan-review.md 文件路径")

    args = parser.parse_args()

    if args.command == "parse":
        cmd_parse(args)
    elif args.command == "verify":
        cmd_verify(args)
    elif args.command == "status":
        cmd_status(args)


if __name__ == "__main__":
    main()
