# `src/legal` — 中国法律文书域规则

本目录是 `@tilo-ui/content-kit/legal` 入口的实现，只处理**中文法律文书书写习惯**带来的 Markdown 解析与完整性判定问题。

- 纯函数、同步执行、可在 SSR 环境运行，不触碰 DOM、网络与文件系统。
- 除同目录内部模块与 `src/content/classify.ts` 的 `isHtmlSubstantivelyEmpty` 外，不依赖其他模块，也不引入第三方依赖。
- 不负责 HTML 渲染。Markdown 渲染见 `/markdown`，HTML ⇄ Markdown 转换见 `/convert`。

单独成入口的原因：大写数字层级标题、诉讼请求小标题、文书总标题去重等规则只对中文公文成立，与通用内容能力的版本节奏和复用范围不同。放进 `/content` 会让通用能力的复用方被域规则绑架。

## 文件职责

| 文件 | 职责 |
| --- | --- |
| `index.ts` | 入口聚合：透出 `CONTENT_KIT_VERSION` 与本目录全部公共符号 |
| `align-containers.ts` | HTML 块级排版容器（居中/右对齐）空行隔离，防止吞噬后续有序列表（内部件） |
| `document-title.ts` | 文书首行重复标题切除；大写数字章节 / 三级小标题行级谓词 |
| `legal-section-headings.ts` | 「诉讼请求：」「事实与理由：」独立成行时的加粗归一化 |
| `normalize.ts` | 公文 Markdown 归一化主流程（编排上述能力） |
| `section-integrity.ts` | 公文小节结构化提取与条目级残缺核验 |

## 对外导出

从包入口导入：

```ts
import {
  CONTENT_KIT_VERSION,
  normalizeLegalMarkdown,
  stripLeadingDocumentTitle,
  isLegalChapterHeading,
  isLegalSubSectionHeading,
  boldLegalSectionHeadings,
  legalSectionHeadingHtml,
  extractLegalSections,
  checkSectionIntegrity,
  type LegalDocumentSections,
  type SectionIntegrityCheckResult,
  type IntegrityFailureReason,
} from '@tilo-ui/content-kit/legal';
```

这些符号属于公共 API，重命名或改变语义会影响下游渲染与质量门禁。

## API 说明

### `normalizeLegalMarkdown(content: string): string`

公文 Markdown 归一化主流程。空输入返回 `''`，否则按固定顺序处理：

1. **去除首尾空白**。
2. **自愈转义下划线**：连续 `\_\_` 还原为 `____`，修复历史 turndown 误转义导致的留白填空横线。
3. **剥离误包裹的 HTML 外壳**：当整段内容被 `<p>` / `<div>` 包裹但本质是 Markdown 时脱壳。
   - 带 `align` 属性或 `text-align` 样式的容器属于公文排版资产（居中标题、右对齐落款），先以占位符保护，脱壳后原样恢复。
   - 仅当脱壳结果呈现 Markdown 特征（标题、表格行、粗体、中文序号标题）时才采用脱壳结果，否则保留原文。
4. **对齐容器空行隔离**：委托 `normalizeAlignContainers` 为带对齐样式的 `<div>` / `<p>` 容器补足内部与前后空行，避免内部标题退化为裸文本、避免 CommonMark HTML Block 吞掉后续有序列表。
   - 按同标签嵌套计数定位闭合标签，最外层优先、内层递归处理；
   - 表格单元格（`<td>` / `<th>`）内部原样保留，不产生破坏性断行；
   - 无配对闭合标签的残缺容器原样保留；
   - 重复执行结果恒等（幂等）。
5. **拆分紧凑列表项**：将 `1. 判令……； 2. 判令……` 这类同一行的多个诉求拆成独立行，保证编译为标准有序列表。分隔符后只消费行内空格（`[ \t]*`），不吞掉已有换行，保证二次归一化不会在列表项之间多插空行。
6. **段落小标题加粗**：见 `boldLegalSectionHeadings`。
7. **防 Setext 标题误判**：文字行后紧跟 `---` / `***` / `___` 时插入空行，确保解析为分割线而非二级标题。
8. **提升公文层级标题**：
   - `isLegalChapterHeading` 命中的行提升为 `##`；
   - `isLegalSubSectionHeading` 命中的行提升为 `###`。
9. **规范粗体空格**：`**诉讼请求: **` → `**诉讼请求:** `；同时收敛粗体标记前的多余水平空白。
10. **规范复合标题符号**：`## # 附件` → `## 附件`；要求两个井号块之间至少有一个水平空白，避免误伤合法 `##` / `###`。

注意：第 8 步的行级谓词要求行首不是 `#`，因此重复调用不会把已提升的标题再次加前缀。

### `stripLeadingDocumentTitle(content: string, documentTitle?: string): string`

在 Markdown 源码阶段切除**首行**与文书元数据标题重复的一级标题。

- 支持两种形态：首行标准 `# 标题`，以及 `<div align="center">` 包裹的 `# 标题`。
- 比对前对两侧做归一化：去除首尾书名号、全半角空白、首尾标点。
- 采用**严格全等**比对，不使用包含式匹配。例如标题为「民事起诉状」时，不会误删「民事起诉状副本」。
- 输入为空、标题为空、标题归一化后为空、首行不匹配时，原样返回内容。
- 只处理行首位置；内容以空行或空白开头时不会命中。

### `isLegalChapterHeading(line: string): boolean`

判断单行是否为公文大写数字章节标题，例如「一、原告基本情况」。全部条件满足才返回 `true`：

- 去空白后非空，且首字符不是 `#`；
- 长度在 4 ~ 30 个字符之间（含边界）；
- 匹配 `^([一二三四五六七八九十百]{1,3})、(.+)$`；
- 正文主体不以断句标点 `、，,；;：:。` 结尾；
- 正文主体不以连续序数词开头（如「二月份」「二两项」）。

### `isLegalSubSectionHeading(line: string): boolean`

判断单行是否为公文三级小标题，例如「（一）借款事实证据」。全部条件满足才返回 `true`：

- 去空白后非空，且首字符不是 `#`；
- 长度在 4 ~ 30 个字符之间；
- 匹配 `^[（(]([一二三四五六七八九十百]{1,3})[）)](.+)$`；
- 正文主体不以 `、，,；;：:。！？!?` 结尾；
- 正文主体内部不含 `。；;`（含句号或分号视为事实陈述，而非小标题）。

长度与标点门禁用于防止把「（一）2025年1月25日……转账人民币3,000元。」这类事实长句误升为标题。

### `boldLegalSectionHeadings(markdown: string): string`

将独立成行的裸小标题「诉讼请求：」「事实与理由：」包裹为粗体。

- 只识别这两个固定标签，保留行首缩进、行尾水平空白与前置换行。
- 已带 `#` 标题标记或已带 `**` 的行保持原样，避免重复包裹。
- 空输入返回 `''`。

### `legalSectionHeadingHtml(text: string): string | null`

供不经过 Markdown 预处理的渲染路径（如共享文档预览）使用：单行命中裸小标题时返回 `<strong>诉讼请求：</strong>`，否则返回 `null`。

标签来自固定白名单，不拼接用户输入，因此不需要额外转义。

### `extractLegalSections(content: string): LegalDocumentSections`

按状态机提取公文关键小节，返回：

| 字段 | 含义 |
| --- | --- |
| `title` | 文书主标题，识别「起诉状」「民事起诉状」「答辩状」「仲裁申请书」「反诉状」 |
| `partiesText` | 标题之后、诉讼请求之前的当事人信息 |
| `claims` | 诉讼请求 / 仲裁请求条目 |
| `factsParagraphs` | 事实与理由的段落列表（逐非空行） |
| `closing` | 「此致」及人民法院 / 仲裁委员会行 |
| `signatures` | 具状人 / 起诉人 / 申请人 / 原告落款行与日期行 |
| `substantiveTextLength` | 去除全部 HTML 标签、空白与零宽字符后的字数 |

若未识别到文书标题，标题前的行同样归入 `partiesText`。

小节标题识别规则：

- 诉讼请求：`诉讼请求` / `仲裁请求`，可带 `#`、粗体、冒号与 `<div>` 外壳；
- 事实与理由：`事实与理由` / `事实和理由` / `事实及理由`；
- 结语：以「此致」开头，或处于事实 / 结语阶段时以「人民法院」「仲裁委员会」结尾的行；
- 落款：仅在结语之后识别具状人 / 起诉人 / 申请人 / 原告行，或 `YYYY年M月D日` 日期行。

诉讼请求条目会先按编号（`1.`、`1、`、`（1）`、`(1)`）拆分，再收集以编号开头或包含「判令 / 支付 / 赔偿 / 归还 / 返还 / 承担」的片段。

`cleanText` 会把 `<br>`、块级闭合标签（含 Yjs / ProseMirror 的 `</paragraph>`、`</heading>`、`</listItem>` 等）转换为换行，再剥离剩余标签。

### `checkSectionIntegrity(baselineContent, targetContent): SectionIntegrityCheckResult`

对比受控基线与目标内容，判断目标是否发生实质性残缺。判定顺序如下，命中即返回：

1. **基线为空**（`undefined` 或 HTML 实质为空）→ 返回 `isTruncated: false`、`reason: 'NONE'`，不做核验。
2. **目标为空** → `TARGET_EMPTY`。
3. **诉求全部蒸发**：基线有诉求条目、目标为 0 条 → `CLAIMS_EVAPORATED`。
4. **诉求严重缩水**：基线诉求 ≥ 2 条，且目标条数**严格小于**基线的 50% → `CLAIMS_SUBSTANTIALLY_LOST`。注意 2 条剩 1 条不属于该分支。
5. **事实首段灭失**：基线事实 ≥ 2 段、目标事实 > 0 段；目标首段以「卷内暂无」「暂无借条」「双方未约定」「未约定」「经原告多次催要」「催告后」「为此，原告」「特向贵院」等套话开头，而基线首段不是 → `FACTS_PREAMBLE_LOST`。
6. **极端字数断崖**：基线实质字数 ≥ 100，且目标不足基线的 35% → `SEVERE_LENGTH_CLIFF`。
7. 其余 → `isTruncated: false`、`reason: 'NONE'`。

返回的 `baselineClaimsCount`、`targetClaimsCount`、`baselineFactsCount`、`targetFactsCount`、`details` 用于日志与审计。该函数是**启发式质量门禁**，只回答「是否疑似截断」，不构成法律判断；阈值与套话词表调整必须同步补充测试样本。

## 使用示例

```ts
import {
  normalizeLegalMarkdown,
  stripLeadingDocumentTitle,
  checkSectionIntegrity,
} from '@tilo-ui/content-kit/legal';

const normalized = normalizeLegalMarkdown(rawMarkdown);
const body = stripLeadingDocumentTitle(normalized, '民事起诉状');

const integrity = checkSectionIntegrity(baselineMarkdown, body);
if (integrity.isTruncated) {
  // 按 reason 走重试 / 回退 / 告警，不要把残缺文本当作最终文书
  console.warn(integrity.reason, integrity.details);
}
```

典型链路位置：

- 后端标准化输出 → 前端渲染前：`stripLeadingDocumentTitle` → `normalizeLegalMarkdown`；
- LLM 改写 / 截断校验：`extractLegalSections` + `checkSectionIntegrity`；
- 非 Markdown 预览路径：`legalSectionHeadingHtml` 处理单行小标题。

## 维护约定

- **保持纯函数**：不做 IO、不读全局状态、不依赖 DOM；新增能力优先复用本目录已有工具。
- **标题匹配只用严格全等**：禁止 `includes` 之类的包含式匹配，避免误删相似标题。
- **收窄 HTML 处理范围**：不得无差别剥离标签；带 `align` / `text-align` 的容器必须保护，表格内部结构不得改写。
- **加严而非放宽门禁**：长度 4 ~ 30 字符、标点排除、连续序数排除等条件都是误伤防线，放宽前先补回归样本。
- **保留排版契约**：`<div align="center|right">` 的保护与 `/convert` 的 `ensureHtml` / `htmlToMarkdown` 往返对齐契约绑定，改动需同时验证往返链路。
- **保持幂等**：`normalizeLegalMarkdown(normalizeLegalMarkdown(x))` 必须与单次结果一致；新增正则时禁止吞掉既有换行或重复注入空行。
- **公共 API 变更**：更新 `api/legal.api.md` 快照（`pnpm api:update`），并先跑 `pnpm api:check`。

## 测试

相关用例：

- `tests/legal-sub-heading.spec.ts` — 三级小标题识别、事实长句防误伤、转义下划线自愈；
- `tests/section-integrity.spec.ts` — 小节提取、诉求蒸发、事实首段灭失等判定；
- `tests/contentUtils-align.spec.ts` — 对齐容器保护、脱壳与表格结构保真；
- `tests/legal-normalize.spec.ts` — 归一化幂等性、嵌套容器、表格单元格保护与残缺容器保真。

```bash
cd sdks/tilo-content-kit
pnpm vitest run tests/legal-sub-heading.spec.ts tests/section-integrity.spec.ts tests/contentUtils-align.spec.ts tests/legal-normalize.spec.ts
pnpm typecheck
```
