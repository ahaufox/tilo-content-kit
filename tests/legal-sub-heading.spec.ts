import { describe, expect, it } from 'vitest';
import { isLegalSubSectionHeading, normalizeLegalMarkdown } from '../src/legal';

describe('isLegalSubSectionHeading & normalizeLegalMarkdown 三级小标题防误伤', () => {
  it('合法的公文三级小标题应精准识别并提升为三级标题', () => {
    expect(isLegalSubSectionHeading('（一）借款事实证据')).toBe(true);
    expect(isLegalSubSectionHeading('（二）还款逾期经过')).toBe(true);
    expect(isLegalSubSectionHeading('(一) 程序性抗辩要点')).toBe(true);

    const input = '（一）借款事实证据\n正文描述...\n\n（二）还款逾期经过\n详细事实...';
    const output = normalizeLegalMarkdown(input);
    expect(output).toContain('### （一）借款事实证据');
    expect(output).toContain('### （二）还款逾期经过');
  });

  it('长段落事实陈述（末尾带句号、含标点或超长）严禁被误提升为三级标题', () => {
    const longFact =
      '（一）2025年1月25日13时31分37秒，原告通过本人微信号（ZKMZ898）向被告微信号（bobo820724）微信转账人民币3,000元（大写：叁仟圆整），被告于同日13时31分43秒确认收款，交易状态为“已收款”，转账单号为1000050001202501251722084235184。';
    expect(isLegalSubSectionHeading(longFact)).toBe(false);

    const output = normalizeLegalMarkdown(longFact);
    expect(output).not.toContain('### （一）');
    expect(output).toBe(longFact);
  });

  it('末尾含断句标点（逗号、句号、分号）的句子严禁被提升', () => {
    expect(isLegalSubSectionHeading('（一）原告已依约履行借款交付义务。')).toBe(false);
    expect(isLegalSubSectionHeading('（二）被告未按约定归还本息，')).toBe(false);
  });

  it('存量转义下划线能够无损自愈为留白填空横线', () => {
    const dirty = '原告联系电话：\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_。';
    const cured = normalizeLegalMarkdown(dirty);
    expect(cured).toBe('原告联系电话：__________。');
  });
});
