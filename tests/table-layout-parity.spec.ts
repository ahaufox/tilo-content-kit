/**
 * 表格列宽前后端一致性（T020）
 *
 * 基准样本由后端 SSOT 算法生成：
 *   .venv/bin/python sdks/tilo-content-kit/scripts/gen-table-layout-parity.py \
 *     > sdks/tilo-content-kit/tests/fixtures/table-layout.parity.json
 *
 * 判定口径：
 *   - aligned=true  ：TS 与后端偏差必须 ≤ 2px（DEFAULT_TABLE_WIDTH_PX 取整差 0.3px，留给四舍五入）
 *   - aligned=false ：已知漂移，只校验结构不变量；若偏差收敛到 ≤ 2px，本用例会失败，
 *                     提示重新生成 fixture 并把 aligned 改为 true（防止修复后无人更新标记）。
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { calculateTableColumnWidths, DEFAULT_TABLE_WIDTH_PX } from '../src/content';

interface ParityCase {
  name: string;
  aligned: boolean;
  rows: string[][];
  widths_px: number[];
}

const fixture = JSON.parse(
  readFileSync(resolve(process.cwd(), 'tests/fixtures/table-layout.parity.json'), 'utf8'),
) as { source: string; dpi: number; cases: ParityCase[] };

const TOLERANCE_PX = 2;

function maxAbsDiff(actual: number[], expected: number[]): number {
  const len = Math.max(actual.length, expected.length);
  let max = 0;
  for (let i = 0; i < len; i += 1) {
    const a = actual[i];
    const e = expected[i];
    if (typeof a !== 'number' || typeof e !== 'number') return Number.POSITIVE_INFINITY;
    max = Math.max(max, Math.abs(a - e));
  }
  return max;
}

describe('表格列宽：与后端 tilo_export 算法对齐', () => {
  it('基准样本来源为后端 SSOT（防止误把 TS 输出当基准）', () => {
    expect(fixture.source).toBe('tilo_export.docx_table_layout');
    expect(fixture.dpi).toBe(96);
    expect(fixture.cases.length).toBeGreaterThanOrEqual(5);
  });

  for (const testCase of fixture.cases) {
    if (testCase.aligned) {
      it(`${testCase.name}：与后端列宽差 ≤ ${TOLERANCE_PX}px`, () => {
        const actual = calculateTableColumnWidths(testCase.rows, DEFAULT_TABLE_WIDTH_PX);
        expect(actual).toHaveLength(testCase.widths_px.length);
        expect(maxAbsDiff(actual, testCase.widths_px)).toBeLessThanOrEqual(TOLERANCE_PX);
      });
    } else {
      it(`${testCase.name}：记录已知漂移（结构不变量 + 偏差仍存在）`, () => {
        const actual = calculateTableColumnWidths(testCase.rows, DEFAULT_TABLE_WIDTH_PX);
        // 结构不变量：列数一致，总宽落在版心附近（允许逐列四舍五入累计误差）
        expect(actual).toHaveLength(testCase.widths_px.length);
        const total = actual.reduce((sum, w) => sum + w, 0);
        expect(Math.abs(total - DEFAULT_TABLE_WIDTH_PX)).toBeLessThanOrEqual(5);

        // 漂移仍存在：若此断言失败，说明算法已收敛，请重新生成 fixture 并置 aligned=true
        expect(maxAbsDiff(actual, testCase.widths_px)).toBeGreaterThan(TOLERANCE_PX);
      });
    }
  }
});
