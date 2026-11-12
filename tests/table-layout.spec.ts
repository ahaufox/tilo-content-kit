import { describe, it, expect } from 'vitest';
import {
  measureCellLength,
  analyzeTableColumnDetails,
  calculateTableColumnWidths,
  injectTableWidthsToHtml,
  DEFAULT_TABLE_WIDTH_PX,
  INDEX_COL_WIDTH_PX,
} from '../src/content/table-layout';

describe('table-layout 表格宽度智能控制算法', () => {
  describe('measureCellLength 单元格长度度量', () => {
    it('英文与数字按 1.0 权重计算，中文按 2.0 权重计算', () => {
      expect(measureCellLength('abc')).toBe(3.0);
      expect(measureCellLength('12345')).toBe(5.0);
      expect(measureCellLength('序号')).toBe(4.0); // 2 * 2.0
      expect(measureCellLength('No. 1')).toBe(5.0); // 5 chars
    });

    it('正确剥离 Markdown 样式标记', () => {
      expect(measureCellLength('**加粗**')).toBe(4.0);
      expect(measureCellLength('`code`')).toBe(4.0);
      expect(measureCellLength('~~删除线~~')).toBe(6.0);
    });

    it('空值与 undefined 安全返回 0', () => {
      expect(measureCellLength('')).toBe(0);
      expect(measureCellLength(null)).toBe(0);
      expect(measureCellLength(undefined)).toBe(0);
    });
  });

  describe('analyzeTableColumnDetails 列特征深度分析', () => {
    it('正确分类序号列、紧凑列、长文本列', () => {
      const rows = [
        ['序号', '证据名称', '日期', '证明目的'],
        ['1', '劳动合同', '2024-01-01', '证明双方存在正式劳动关系'],
      ];
      const analysis = analyzeTableColumnDetails(rows);
      expect(analysis.colTypes[0]).toBe('index');
      expect(analysis.colTypes[1]).toBe('long');
      expect(analysis.colTypes[2]).toBe('compact');
      expect(analysis.colTypes[3]).toBe('long');
    });

    it('第一行（表头）内容较长时，重点加权参考第一行，而非被短数据行平均稀释', () => {
      const rows = [
        ['违约责任及赔偿标准约定', '状态'],
        ['有', '正常'],
        ['无', '正常'],
        ['有', '正常'],
      ];
      const analysis = analyzeTableColumnDetails(rows);
      // 表头 11 个汉字 = 22 权重，数据行仅 2；后端 SSOT 采用折中公式
      // (header * 1.15 + dataAvg) / 2 = 13.65，明显高于"仅数据均值"的 2，避免表头被稀释
      expect(analysis.densities[0]).toBeCloseTo((22 * 1.15 + 2) / 2, 1);
      expect(analysis.densities[0]).toBeGreaterThan(2.0);
      // 最小安全宽度 = 表头权重 × 单宽字符(0.032in) + 内边距(0.15in)，@96dpi ≈ 82px
      expect(analysis.minWidths[0]).toBeCloseTo(22 * 3.072 + 14.4, 1);
      expect(analysis.minWidths[0]).toBeGreaterThan(48);
    });
  });

  describe('calculateTableColumnWidths 列宽求解计算', () => {
    it('序号列分配紧凑宽度（48px），且将大部分宽度让渡给后续长文本列', () => {
      const rows = [
        ['序号', '证据名称', '证明目的'],
        ['1', '房屋买卖合同原件', '证明双方存在房屋买卖合同关系及付款约定事实'],
        ['2', '银行转账凭证电子回单', '证明买受人已按照合同约定向出卖人足额支付首期购房款'],
      ];
      const widths = calculateTableColumnWidths(rows, DEFAULT_TABLE_WIDTH_PX);
      expect(widths.length).toBe(3);
      expect(widths.reduce((sum, w) => sum + w, 0)).toBe(DEFAULT_TABLE_WIDTH_PX);

      // 序号列紧凑固定为 48px
      expect(widths[0]).toBe(INDEX_COL_WIDTH_PX);
      // 证明目的列占比最高
      expect(widths[2]).toBeGreaterThan(widths[1]);
      expect(widths[2]).toBeGreaterThan(widths[0] * 3);
    });

    it('长表头列分配足够的防折行安全宽度', () => {
      const rows = [
        ['违约责任及赔偿标准约定', '状态'],
        ['有', '正常'],
        ['无', '正常'],
      ];
      const widths = calculateTableColumnWidths(rows, DEFAULT_TABLE_WIDTH_PX);
      expect(widths.length).toBe(2);
      expect(widths.reduce((sum, w) => sum + w, 0)).toBe(DEFAULT_TABLE_WIDTH_PX);

      // 第一列因表头长，应获得显著大于第二列的宽度
      expect(widths[0]).toBeGreaterThan(widths[1] * 2);
    });

    it('8 列证据目录各列层次分明，总宽精确吻合 550px', () => {
      const rows = [
        ['序号', '证据名称', '证据来源', '证据类型', '证明目的', '页码', '原件/复印件', '备注'],
        ['1', '劳动合同书', '用人单位', '书证', '证明劳动者与用人单位自2020年起存在合法有效的劳动关系', '1-5', '原件', '双方签字盖章完整'],
        ['2', '银行工资流水', '招商银行', '书证', '证明用人单位每月实发工资金额及奖金明细', '6-12', '复印件', '加盖银行电子印章'],
      ];
      const widths = calculateTableColumnWidths(rows, DEFAULT_TABLE_WIDTH_PX);
      expect(widths.length).toBe(8);
      expect(widths.reduce((sum, w) => sum + w, 0)).toBe(DEFAULT_TABLE_WIDTH_PX);

      // 序号列 (0) 与页码列 (5) 紧凑
      expect(widths[0]).toBeLessThan(60);
      expect(widths[5]).toBeLessThan(70);
      // 证明目的列 (4) 占比最高
      expect(widths[4]).toBe(Math.max(...widths));
    });

    it('保留用户显式指定的固定列宽', () => {
      const rows = [
        ['A', 'B', 'C'],
        ['1', '2', '3'],
      ];
      const widths = calculateTableColumnWidths(rows, 550, { 0: 100 });
      expect(widths[0]).toBe(100);
      expect(widths.reduce((sum, w) => sum + w, 0)).toBe(550);
    });
  });

  describe('injectTableWidthsToHtml HTML 注入', () => {
    it('成功为无 colwidth 的 table 注入 colgroup 与单元格 colwidth 属性', () => {
      const html = `
        <table>
          <thead>
            <tr><th>序号</th><th>证据名称</th><th>证明目的</th></tr>
          </thead>
          <tbody>
            <tr><td>1</td><td>合同</td><td>证明合同关系</td></tr>
          </tbody>
        </table>
      `;
      const result = injectTableWidthsToHtml(html, DEFAULT_TABLE_WIDTH_PX);
      expect(result).toContain('<colgroup>');
      expect(result).toContain(`colwidth="${INDEX_COL_WIDTH_PX}"`);
      expect(result).toContain(`style="width: ${INDEX_COL_WIDTH_PX}px;"`);
      expect(result).toContain('colwidth=');
    });

    it('已存在 colwidth 属性的 table 保持原样不重复修改', () => {
      const html = `<table colwidth='[100, 200, 250]'><tr><td>1</td></tr></table>`;
      const result = injectTableWidthsToHtml(html);
      expect(result).toBe(html);
    });
  });
});

