#!/usr/bin/env python3
"""生成表格列宽前后端一致性基准样本（T020）。

数据源：`tilo_export.docx_table_layout`（后端 Word 导出的 SSOT 算法）。
用法（在主仓根目录执行，使用项目 .venv）：

    .venv/bin/python sdks/tilo-content-kit/scripts/gen-table-layout-parity.py \
      > sdks/tilo-content-kit/tests/fixtures/table-layout.parity.json

产物字段：
  - widths_px：后端算法输出的列宽（英寸 × 96 DPI）
  - aligned：与 TS 实现的实测偏差是否 ≤ 2px（由生成时人工比对填入，见 note）

注意：本脚本只读取算法，不修改后端；跨仓复用时必须在主仓根目录执行
（`.venv` 与 `tilo_export` 只在该环境可用）。
"""
from __future__ import annotations

import json

from tilo_export import docx_table_layout as layout

DPI = 96

CASES = [
    (
        "序号-证据-目的 三列",
        [
            ["序号", "证据名称", "证明目的"],
            ["1", "借款合同", "证明双方存在借贷合意"],
            ["2", "转账凭证", "证明款项已实际交付"],
        ],
    ),
    ("两列短文本", [["项目", "内容"], ["原告", "张三"], ["被告", "李四"]]),
    (
        "四列-紧凑表头",
        [
            ["序号", "日期", "金额", "状态"],
            ["1", "2026-01-01", "100,000", "已支付"],
            ["2", "2026-02-01", "20,000", "未支付"],
        ],
    ),
    (
        "两列-长文本",
        [
            ["争议焦点", "法律分析"],
            ["合同是否成立", "依据民法典第四百九十条，双方签字盖章即成立。"],
            ["是否生效", "依据民法典第五百零二条，自成立时生效。"],
        ],
    ),
    (
        "五列-混合",
        [
            ["#", "名称", "数量", "单位", "备注"],
            ["1", "合同", "2", "份", "原件"],
            ["2", "发票", "1", "张", "复印件"],
        ],
    ),
    (
        "六列-全短",
        [
            ["A", "B", "C", "D", "E", "F"],
            ["1", "2", "3", "4", "5", "6"],
            ["a", "b", "c", "d", "e", "f"],
        ],
    ),
]

# 2026-11-12：TS 已按后端 SSOT 移植（密度公式 / 最小宽常量 / 首列收敛目标），
# 6 个用例偏差均 ≤ 1px（仅取整差）。若后续出现 > 2px 的用例，把该用例置 False 并记录原因。
ALIGNED = {
    "序号-证据-目的 三列": True,
    "两列短文本": True,
    "四列-紧凑表头": True,
    "两列-长文本": True,
    "五列-混合": True,
    "六列-全短": True,
}


def main() -> None:
    cases = []
    for name, rows in CASES:
        densities, num_cols, min_widths, col_types = layout.analyze_column_details(rows)
        widths_in = layout.allocate_column_widths(
            densities, num_cols, None, min_widths, col_types
        )
        cases.append(
            {
                "name": name,
                "aligned": ALIGNED[name],
                "rows": rows,
                "widths_px": [round(w * DPI, 2) for w in widths_in],
            }
        )

    payload = {
        "source": "tilo_export.docx_table_layout",
        "dpi": DPI,
        "note": (
            "由 gen-table-layout-parity.py 生成；aligned=false 表示 TS 与后端算法实测偏差 > 2px，"
            "属于已知漂移，需在收敛算法时修正并翻转该标记。"
        ),
        "cases": cases,
    }
    print(json.dumps(payload, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
