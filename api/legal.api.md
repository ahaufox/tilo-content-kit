# API 快照：@tilo-ui/content-kit/legal

> 自动生成，请勿手改。刷新：`pnpm api:update`。校验：`pnpm api:check`。

<!-- 类型摘要 sha256:340f84670cfdafcf -->

## 运行时导出符号

- `CONTENT_KIT_VERSION`
- `boldLegalSectionHeadings`
- `checkSectionIntegrity`
- `extractLegalSections`
- `isLegalChapterHeading`
- `isLegalSubSectionHeading`
- `legalSectionHeadingHtml`
- `normalizeLegalMarkdown`
- `stripLeadingDocumentTitle`

## 类型声明（归一化，含本地共享 chunk）

```ts
export { C as CONTENT_KIT_VERSION } from './version.js';
export { b as boldLegalSectionHeadings, i as isLegalChapterHeading, a as isLegalSubSectionHeading, l as legalSectionHeadingHtml, n as normalizeLegalMarkdown, s as stripLeadingDocumentTitle } from './normalize.js';

/**
 * legal/section-integrity — 法律公文小节条目提取与条目级完整度核验（纯函数，零依赖）
 *
 * 解决问题 (CNB Issue #585)：
 *  - 替代粗粒度总字数比率断崖判断（解决总字数保留 77% 但诉求条目与事实首段蒸发时被短路放行的缺陷）
 *  - 细粒度提取公文关键小节（当事人、诉讼请求条目、事实理由段落、落款），核验条目级完整度
 */
/**
 * 法律公文（起诉状/答辩状/仲裁申请书）结构化小节要素
 */
interface LegalDocumentSections {
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
type IntegrityFailureReason = 'TARGET_EMPTY' | 'CLAIMS_EVAPORATED' | 'CLAIMS_SUBSTANTIALLY_LOST' | 'FACTS_PREAMBLE_LOST' | 'SEVERE_LENGTH_CLIFF' | 'NONE';
/**
 * 条目级完整度检查结果
 */
interface SectionIntegrityCheckResult {
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
 * 结构化提取公文关键要素小节
 */
declare function extractLegalSections(content: string): LegalDocumentSections;
/**
 * 条目级完整度核验核心函数 (Pure Function)
 */
declare function checkSectionIntegrity(baselineContent: string | undefined, targetContent: string | undefined): SectionIntegrityCheckResult;

export { type IntegrityFailureReason, type LegalDocumentSections, type SectionIntegrityCheckResult, checkSectionIntegrity, extractLegalSections };
```
