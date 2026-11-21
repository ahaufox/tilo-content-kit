/**
 * legal/section-integrity — 法律公文小节条目提取与条目级完整度核验（纯函数，零依赖）
 *
 * 解决问题 (CNB Issue #585)：
 *  - 替代粗粒度总字数比率断崖判断（解决总字数保留 77% 但诉求条目与事实首段蒸发时被短路放行的缺陷）
 *  - 细粒度提取公文关键小节（当事人、诉讼请求条目、事实理由段落、落款），核验条目级完整度
 */

import { isHtmlSubstantivelyEmpty } from '../content/classify';

/**
 * 法律公文（起诉状/答辩状/仲裁申请书）结构化小节要素
 */
export interface LegalDocumentSections {
  /** 文书主标题（如：民事起诉状、起诉状） */
  title: string | null;
  /** 当事人主体信息块（原告、被告、第三人等） */
  partiesText: string;
  /** 诉讼/仲裁请求条目清单（按序提取的条目内容） */
  claims: string[];
  /** 事实与理由正文段落列表（排除标题行后的实质展开段落） */
  factsParagraphs: string[];
  /** 送达裁判机构与致敬语（如：此致 XX人民法院） */
  closing: string | null;
  /** 落款主体与日期（具状人、起诉人、日期） */
  signatures: string[];
  /** 原始纯净文本总字数（排除所有 HTML/Markdown 控制标记与空白） */
  substantiveTextLength: number;
}

/**
 * 完整度对比与残缺判定原因枚举
 */
export type IntegrityFailureReason =
  | 'TARGET_EMPTY'              // 目标内容实质为空
  | 'CLAIMS_EVAPORATED'         // 原文包含诉讼主张条目，而目标内容诉讼主张条目全部灭失
  | 'CLAIMS_SUBSTANTIALLY_LOST' // 原文诉讼主张条目数 >= 2，目标内容丢失超过 50% 的主张
  | 'FACTS_PREAMBLE_LOST'       // 事实与理由第一段核心借款/案件事实灭失，仅残留尾部套话
  | 'SEVERE_LENGTH_CLIFF'       // 极端字数暴跌（剩余字符不足 35% 且无复杂表格保护）
  | 'NONE';                     // 内容完整合法，无残缺截断

/**
 * 条目级完整度检查结果
 */
export interface SectionIntegrityCheckResult {
  /** 是否存在实质性残缺截断 */
  isTruncated: boolean;
  /** 判定原因归因 */
  reason: IntegrityFailureReason;
  /** 受控基线诉讼请求条目数 */
  baselineClaimsCount: number;
  /** 目标待评估内容诉讼请求条目数 */
  targetClaimsCount: number;
  /** 受控基线事实理由段落数 */
  baselineFactsCount: number;
  /** 目标待评估内容事实理由段落数 */
  targetFactsCount: number;
  /** 详细审计描述 */
  details: string;
}

/**
 * 清除文本中的 HTML 标签并规范化段落换行
 */
function cleanText(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\r\n/g, '\n');
}

/**
 * 结构化提取公文关键要素小节
 */
export function extractLegalSections(content: string): LegalDocumentSections {
  const substantiveText = content
    .replace(/<[^>]+>/g, '')
    .replace(/[\s\u200B-\u200D\uFEFF]/g, '');

  const text = cleanText(content);
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  let title: string | null = null;
  const partiesLines: string[] = [];
  const claims: string[] = [];
  const factsParagraphs: string[] = [];
  let closing: string | null = null;
  const signatures: string[] = [];

  // 状态机游标
  let currentSection: 'header' | 'parties' | 'claims' | 'facts' | 'closing' | 'footer' = 'header';

  // 正则常量
  const titleRegex = /^(?:#+\s*)?(?:(?:民事)?起诉状|答辩状|仲裁申请书|反诉状)$/;
  const claimsHeadingRegex = /^(?:<div[^>]*>)?(?:\*{1,2}|#+\s*)?(?:诉讼请求|仲裁请求)[：:]?(?:\*{1,2})?(?:<\/div>)?$/;
  const factsHeadingRegex = /^(?:<div[^>]*>)?(?:\*{1,2}|#+\s*)?(?:事实与理由|事实和理由|事实及理由)[：:]?(?:\*{1,2})?(?:<\/div>)?$/;
  const closingRegex = /^此致(?:\s*|$)/;
  const courtRegex = /(?:人民法院|仲裁委员会)$/;
  const signatureRegex = /^(?:具状人|起诉人|申请人|原告)[：:]/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 检测主标题
    if (!title && titleRegex.test(line)) {
      title = line.replace(/^[#\s*]+|[#\s*]+$/g, '');
      currentSection = 'parties';
      continue;
    }

    // 检测诉讼请求标题
    if (claimsHeadingRegex.test(line)) {
      currentSection = 'claims';
      continue;
    }

    // 检测事实与理由标题
    if (factsHeadingRegex.test(line)) {
      currentSection = 'facts';
      continue;
    }

    // 检测送达法院（通常标志着正文结束，进入文尾结语与落款）
    if (closingRegex.test(line) || (courtRegex.test(line) && (currentSection === 'facts' || currentSection === 'closing'))) {
      closing = closing ? `${closing}\n${line}` : line;
      currentSection = 'closing';
      continue;
    }

    // 检测落款签名（仅在结语之后，或已进入 footer 时识别）
    if (
      (currentSection === 'closing' || currentSection === 'footer') &&
      (signatureRegex.test(line) || /^\d{4}年\d{1,2}月\d{1,2}日$/.test(line))
    ) {
      signatures.push(line);
      currentSection = 'footer';
      continue;
    }

    // 收集各小节内容
    if (currentSection === 'header' || currentSection === 'parties') {
      partiesLines.push(line);
    } else if (currentSection === 'claims') {
      // 拆分可能紧凑相连的诉讼请求条目（如 "1. 判令... 2. 判令..."）
      const itemMatches = line.split(/(?=(?:^|\s+)(?:\d+[.、]|（\d+）|\(\d+\))\s*)/).map((s) => s.trim()).filter(Boolean);
      for (const item of itemMatches) {
        if (/^(?:\d+[.、]|（\d+）|\(\d+\))/.test(item) || /(?:判令|支付|赔偿|归还|返还|承担)/.test(item)) {
          claims.push(item);
        }
      }
    } else if (currentSection === 'facts') {
      factsParagraphs.push(line);
    }
  }

  return {
    title,
    partiesText: partiesLines.join('\n'),
    claims,
    factsParagraphs,
    closing,
    signatures,
    substantiveTextLength: substantiveText.length,
  };
}

/**
 * 条目级完整度核验核心函数 (Pure Function)
 */
export function checkSectionIntegrity(
  baselineContent: string | undefined,
  targetContent: string | undefined,
): SectionIntegrityCheckResult {
  // 1. 基线非空但目标为空检查
  if (!targetContent || isHtmlSubstantivelyEmpty(targetContent)) {
    return {
      isTruncated: true,
      reason: 'TARGET_EMPTY',
      baselineClaimsCount: 0,
      targetClaimsCount: 0,
      baselineFactsCount: 0,
      targetFactsCount: 0,
      details: '待评估目标内容为空或实质为空标签',
    };
  }

  if (!baselineContent || isHtmlSubstantivelyEmpty(baselineContent)) {
    return {
      isTruncated: false,
      reason: 'NONE',
      baselineClaimsCount: 0,
      targetClaimsCount: 0,
      baselineFactsCount: 0,
      targetFactsCount: 0,
      details: '基线内容为空，无需残缺核验',
    };
  }

  const baseSections = extractLegalSections(baselineContent);
  const targetSections = extractLegalSections(targetContent);

  // 2. 诉求条目完全蒸发核验 (Issue #585 核心铁证)
  // 基线包含诉讼主张条目，而目标内容诉讼主张条目为 0
  if (baseSections.claims.length > 0 && targetSections.claims.length === 0) {
    return {
      isTruncated: true,
      reason: 'CLAIMS_EVAPORATED',
      baselineClaimsCount: baseSections.claims.length,
      targetClaimsCount: 0,
      baselineFactsCount: baseSections.factsParagraphs.length,
      targetFactsCount: targetSections.factsParagraphs.length,
      details: `基线包含 ${baseSections.claims.length} 项诉求条目，但目标内容全部蒸发为 0 项`,
    };
  }

  // 3. 诉求条目实质减少核验
  if (baseSections.claims.length >= 2 && targetSections.claims.length < baseSections.claims.length * 0.5) {
    return {
      isTruncated: true,
      reason: 'CLAIMS_SUBSTANTIALLY_LOST',
      baselineClaimsCount: baseSections.claims.length,
      targetClaimsCount: targetSections.claims.length,
      baselineFactsCount: baseSections.factsParagraphs.length,
      targetFactsCount: targetSections.factsParagraphs.length,
      details: `诉讼请求条目严重缩水（基线 ${baseSections.claims.length} 项，目标仅剩 ${targetSections.claims.length} 项）`,
    };
  }

  // 4. 事实与理由首段案件事实灭失核验 (Issue #585 核心铁证)
  // 基线事实具备多段展开，而目标首段并不包含基线首段的关键事实，直接从案卷评述或程序套话开始
  if (
    baseSections.factsParagraphs.length >= 2 &&
    targetSections.factsParagraphs.length > 0
  ) {
    const basePreamble = baseSections.factsParagraphs[0];
    const targetFirst = targetSections.factsParagraphs[0];

    // 若基线首段陈述具体借款/交付/合同发生事实，而目标首段直接以案卷评述、未约定事项或催告套话开头
    const isTargetFirstAbnormalFollowUp = /^(?:卷内暂无|暂无借条|双方未约定|未约定|后?经原告多次催要|催告后|为此[，,]原告|特向贵院)/.test(targetFirst);
    const isBaseFirstNormalPreamble = !/^(?:卷内暂无|暂无借条|双方未约定|未约定|后?经原告多次催要|催告后|为此[，,]原告|特向贵院)/.test(basePreamble);

    if (isBaseFirstNormalPreamble && isTargetFirstAbnormalFollowUp) {
      return {
        isTruncated: true,
        reason: 'FACTS_PREAMBLE_LOST',
        baselineClaimsCount: baseSections.claims.length,
        targetClaimsCount: targetSections.claims.length,
        baselineFactsCount: baseSections.factsParagraphs.length,
        targetFactsCount: targetSections.factsParagraphs.length,
        details: '事实与理由首段案件事实灭失，目标直接以案卷评述或程序套话开始',
      };
    }
  }

  // 5. 极端字数断崖兜底（文字量不足基线的 35%）
  if (
    baseSections.substantiveTextLength >= 100 &&
    targetSections.substantiveTextLength < baseSections.substantiveTextLength * 0.35
  ) {
    return {
      isTruncated: true,
      reason: 'SEVERE_LENGTH_CLIFF',
      baselineClaimsCount: baseSections.claims.length,
      targetClaimsCount: targetSections.claims.length,
      baselineFactsCount: baseSections.factsParagraphs.length,
      targetFactsCount: targetSections.factsParagraphs.length,
      details: `总字符量暴跌（基线 ${baseSections.substantiveTextLength} 字，目标仅 ${targetSections.substantiveTextLength} 字）`,
    };
  }

  return {
    isTruncated: false,
    reason: 'NONE',
    baselineClaimsCount: baseSections.claims.length,
    targetClaimsCount: targetSections.claims.length,
    baselineFactsCount: baseSections.factsParagraphs.length,
    targetFactsCount: targetSections.factsParagraphs.length,
    details: '条目与小节完整度核验通过',
  };
}
