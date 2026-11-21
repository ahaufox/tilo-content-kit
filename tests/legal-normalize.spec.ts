import { describe, expect, it } from 'vitest';
import { ensureHtml } from '../src/convert';
import { normalizeLegalMarkdown } from '../src/legal';

/**
 * 公文归一化幂等性与结构保护契约（CNB Issue #585 / 专案 525 三审整改）
 *
 * 覆盖三条硬约束：
 *  1. 幂等：对已归一化文本再跑一次，输出必须与第一次完全一致（A→B→C 恒等）；
 *  2. 表格保护：含对齐属性的单元格段落不得被破坏性断行；
 *  3. 嵌套容器：嵌套 <div><p>…</p></div> 的 </div> 后必须补独立空行。
 */
describe('normalizeLegalMarkdown — 幂等性与结构保护', () => {
  const COMPLAINT = [
    '<div align="center">**诉讼请求**</div>',
    '1. 判令偿还本金13000元； 2. 判令承担诉讼费用。',
    '<div align="center">**事实与理由**</div>',
    '2023年1月1日，被告因资金周转向原告借款10万元并出具借条。',
    '<div align="right">具状人：张三</div>',
  ].join('\n');

  it('对已归一化文本重复执行结果恒等（A→B→C 一致）', () => {
    const first = normalizeLegalMarkdown(COMPLAINT);
    const second = normalizeLegalMarkdown(first);
    const third = normalizeLegalMarkdown(second);

    expect(second).toBe(first);
    expect(third).toBe(first);
  });

  it('紧凑列表项拆分后不得在列表项之间多插空行', () => {
    const normalized = normalizeLegalMarkdown(COMPLAINT);

    // 拆分后为两个独立行，且行间不得出现空行
    expect(normalized).toContain('1. 判令偿还本金13000元；\n2. 判令承担诉讼费用。');
    expect(normalized).not.toContain('1. 判令偿还本金13000元；\n\n2. 判令承担诉讼费用。');
  });

  it('含对齐属性的表格单元格段落不得被破坏性断行', () => {
    const rawTable =
      '<table><tr><td><p align="center">单元格居中段落</p></td>' +
      '<td><p align="right">单元格右对齐段落</p></td></tr></table>';
    const normalized = normalizeLegalMarkdown(rawTable);

    expect(normalized).toContain('<td><p align="center">单元格居中段落</p></td>');
    expect(normalized).toContain('<td><p align="right">单元格右对齐段落</p></td>');
    expect(normalized).not.toContain('</p>\n');
    expect(normalized).not.toContain('\n\n');
  });

  it('嵌套 <div><p>…</p></div> 的 </div> 后必须补独立空行', () => {
    const nested = '<div align="center"><p>民事起诉状</p></div>\n1. 判令偿还本金13000元。';
    const normalized = normalizeLegalMarkdown(nested);

    expect(normalized).toContain('</div>\n\n1. 判令偿还本金13000元。');
    // 幂等：二次归一化不得改变结果
    expect(normalizeLegalMarkdown(normalized)).toBe(normalized);
  });

  it('对齐容器起始标签前必须补独立空行，且不吞掉相邻正文', () => {
    const raw = '诉讼请求：\n<div align="center">**事实与理由**</div>\n正文段落。';
    const normalized = normalizeLegalMarkdown(raw);

    expect(normalized).toContain('**诉讼请求：**\n\n<div align="center">');
    expect(normalized).toContain('</div>\n\n正文段落。');
  });

  it('无配对闭合标签的残缺对齐容器不得被误伤', () => {
    const raw = '<div align="center">**未闭合标题**';
    const normalized = normalizeLegalMarkdown(raw);

    expect(normalized).toContain('<div align="center">');
    expect(normalized).toContain('**未闭合标题**');
  });

  it('未闭合起始对齐容器遇后文独立闭合标签时行为稳定且不崩溃', () => {
    // 边界场景：起始标签未就地闭合，但下文存在独立的 </div> 闭合标签
    const raw = '<div align="center">未闭合标题\n正文段落。\n</div>\n后续段落。';
    const normalized = normalizeLegalMarkdown(raw);

    expect(normalized).toContain('<div align="center">');
    expect(normalized).toContain('</div>');
    expect(normalized).toContain('后续段落。');
    // 验证幂等性
    expect(normalizeLegalMarkdown(normalized)).toBe(normalized);
  });

  it('归一化后的紧凑列表仍被编译为两个独立 li 列表项', () => {
    const html = ensureHtml(COMPLAINT);
    const liMatches = html.match(/<li\b[^>]*>/g) || [];

    expect(liMatches.length).toBe(2);
    expect(html).toContain('判令偿还本金13000元');
    expect(html).toContain('判令承担诉讼费用');
  });
});
