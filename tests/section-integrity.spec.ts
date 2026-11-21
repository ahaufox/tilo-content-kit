import { describe, it, expect } from 'vitest';
import {
  extractLegalSections,
  checkSectionIntegrity,
} from '../src/legal/section-integrity';

describe('legal/section-integrity — 公文小节与条目完整度核验 (Issue #585)', () => {
  const fullPetition = `# 起诉状

原告：周凯，男，汉族，1990年1月1日出生，住址：北京市朝阳区。
被告：李某，男，汉族，1988年2月2日出生，住址：北京市海淀区。

<div align="center">**诉讼请求**</div>
1. 判令被告向原告偿还借款本金人民币13000.00元； 2. 判令被告承担本案全部诉讼费用。
<div align="center">**事实与理由**</div>
被告因资金周转需要于2025年1月向原告借款，原告于2025年1月25日通过微信向被告转账3000元，又于2025年3月26日通过微信向被告转账10000元，合计向被告交付借款本金13000元。
卷内暂无借条，以上借款未约定利息，未约定还款期限。
后经原告多次催要，被告至今未予偿还。为此，原告为维护自身合法权益，特向贵院提起诉讼，望判如所请。

此致
北京市海淀区人民法院

具状人：周凯
2025年5月1日`;

  const truncatedPetitionIssue585 = `原告：周凯，男，汉族，1990年1月1日出生，住址：北京市朝阳区。
被告：李某，男，汉族，1988年2月2日出生，住址：北京市海淀区。

<div align="center">**诉讼请求**</div>
<div align="center">**事实与理由**</div>
卷内暂无借条，以上借款未约定利息，未约定还款期限。
后经原告多次催要，被告至今未予偿还。为此，原告为维护自身合法权益，特向贵院提起诉讼，望判如所请。

此致
北京市海淀区人民法院

具状人：周凯
2025年5月1日`;

  describe('extractLegalSections 结构化小节提取', () => {
    it('应精准提取完整起诉状的主标题、诉求条目与事实段落', () => {
      const sections = extractLegalSections(fullPetition);
      expect(sections.title).toContain('起诉状');
      expect(sections.partiesText).toContain('原告：周凯');
      expect(sections.partiesText).toContain('被告：李某');
      expect(sections.claims.length).toBeGreaterThanOrEqual(2);
      expect(sections.claims[0]).toContain('13000');
      expect(sections.claims[1]).toContain('诉讼费用');
      expect(sections.factsParagraphs.length).toBeGreaterThanOrEqual(2);
      expect(sections.factsParagraphs[0]).toContain('于2025年1月向原告借款');
      expect(sections.closing).toContain('北京市海淀区人民法院');
      expect(sections.signatures[0]).toContain('周凯');
    });

    it('对残缺样本应提取到 0 个诉求条目，且首段为后续段落', () => {
      const sections = extractLegalSections(truncatedPetitionIssue585);
      expect(sections.claims.length).toBe(0);
      expect(sections.factsParagraphs.length).toBeGreaterThanOrEqual(1);
      expect(sections.factsParagraphs[0]).toContain('卷内暂无借条');
    });
  });

  describe('checkSectionIntegrity 条目级完整度核验', () => {
    it('目标为空时应判定为 TARGET_EMPTY 并标记残缺', () => {
      const result = checkSectionIntegrity(fullPetition, '');
      expect(result.isTruncated).toBe(true);
      expect(result.reason).toBe('TARGET_EMPTY');
    });

    it('现场 Issue #585 样本：诉讼请求条目蒸发时，无论剩余字数多长（77.1%），必须判定为 CLAIMS_EVAPORATED 且 isTruncated=true', () => {
      const result = checkSectionIntegrity(fullPetition, truncatedPetitionIssue585);
      expect(result.isTruncated).toBe(true);
      expect(result.reason).toBe('CLAIMS_EVAPORATED');
      expect(result.baselineClaimsCount).toBeGreaterThanOrEqual(2);
      expect(result.targetClaimsCount).toBe(0);
    });

    it('当事实与理由首段案情灭失时，应判定为 FACTS_PREAMBLE_LOST 且 isTruncated=true', () => {
      // 构造保留了诉讼请求但灭失了借款首段事实、总体字数充裕的样本
      const petitionWithClaimsButNoFactPreamble = `原告：周凯，男，汉族，1990年1月1日出生，住址：北京市朝阳区。
被告：李某，男，汉族，1988年2月2日出生，住址：北京市海淀区。

<div align="center">**诉讼请求**</div>
1. 判令被告向原告偿还借款本金人民币13000.00元； 2. 判令被告承担本案全部诉讼费用。
<div align="center">**事实与理由**</div>
卷内暂无借条，以上借款未约定利息，未约定还款期限。
后经原告多次催要，被告至今未予偿还。为此，原告为维护自身合法权益，特向贵院提起诉讼，望判如所请。

此致
北京市海淀区人民法院

具状人：周凯
2025年5月1日`;

      const result = checkSectionIntegrity(fullPetition, petitionWithClaimsButNoFactPreamble);
      expect(result.isTruncated).toBe(true);
      expect(result.reason).toBe('FACTS_PREAMBLE_LOST');
    });

    it('正常内容或用户合法修改条目时，应判定为 NONE 且 isTruncated=false', () => {
      const editedPetition = fullPetition.replace('13000.00元', '15000.00元');
      const result = checkSectionIntegrity(fullPetition, editedPetition);
      expect(result.isTruncated).toBe(false);
      expect(result.reason).toBe('NONE');
    });

    it('基线为空时，无论目标为空还是非空，均返回 NONE 且 isTruncated=false (建议项 7)', () => {
      const resultEmpty = checkSectionIntegrity('', '');
      expect(resultEmpty.isTruncated).toBe(false);
      expect(resultEmpty.reason).toBe('NONE');

      const resultWithTarget = checkSectionIntegrity('', fullPetition);
      expect(resultWithTarget.isTruncated).toBe(false);
      expect(resultWithTarget.reason).toBe('NONE');
    });

    it('真实 Yjs 无换行 XML 片段（带 </paragraph> 等 ProseMirror 标签）应精准识别诉求条目，绝不误判为残缺 (阻断项 1)', () => {
      // 真实 Yjs toString() 输出为连续无换行 XML 标签 (无 \n)
      const realYjsFragmentString = [
        '<paragraph># 起诉状</paragraph>',
        '<paragraph>原告：周凯，男，汉族，1990年1月1日出生，住址：北京市朝阳区。</paragraph>',
        '<paragraph>被告：李某，男，汉族，1988年2月2日出生，住址：北京市海淀区。</paragraph>',
        '<paragraph>诉讼请求：</paragraph>',
        '<paragraph>1. 判令被告向原告偿还借款本金人民币13000.00元；</paragraph>',
        '<paragraph>2. 判令被告承担本案全部诉讼费用。</paragraph>',
        '<paragraph>事实与理由：</paragraph>',
        '<paragraph>被告因资金周转需要于2025年1月向原告借款，原告于2025年1月25日通过微信向被告转账3000元，又于2025年3月26日通过微信向被告转账10000元，合计向被告交付借款本金13000元。</paragraph>',
        '<paragraph>卷内暂无借条，以上借款未约定利息，未约定还款期限。</paragraph>',
        '<paragraph>后经原告多次催要，被告至今未予偿还。为此，原告为维护自身合法权益，特向贵院提起诉讼，望判如所请。</paragraph>',
        '<paragraph>此致</paragraph>',
        '<paragraph>北京市海淀区人民法院</paragraph>',
        '<paragraph>具状人：周凯</paragraph>',
        '<paragraph>2025年5月1日</paragraph>',
      ].join('');

      const sections = extractLegalSections(realYjsFragmentString);
      expect(sections.claims.length).toBeGreaterThanOrEqual(2);
      expect(sections.claims[0]).toContain('13000');
      expect(sections.claims[1]).toContain('诉讼费用');

      const result = checkSectionIntegrity(fullPetition, realYjsFragmentString);
      expect(result.isTruncated).toBe(false);
      expect(result.reason).toBe('NONE');
      expect(result.targetClaimsCount).toBeGreaterThanOrEqual(2);
    });
  });
});
