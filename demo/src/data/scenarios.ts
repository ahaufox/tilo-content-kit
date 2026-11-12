/**
 * scenarios — 文档站的「按场景接入」样例集
 *
 * 站点原先所有样例都是法律文书，容易被读成「只服务法律行业」。这里把同一套
 * 入口（/markdown /content /convert /tiptap /legal…）落到四类日常场景上：
 * 电商售后客服、会议纪要、技术文档问答，法律文书只作为其中一种域规则样例。
 *
 * 每个场景给三样东西：用到的入口、接入步骤、最小代码，外加一段真实样例文档
 * （由 SDK 的 MarkdownContent / StreamingMarkdown 渲染，不写死静态 HTML）。
 */

export interface Scenario {
  id: ScenarioId;
  /** Tab 标签 */
  label: string;
  /** 一句话：谁在什么场景下用它 */
  brief: string;
  /** 该场景拼起来的公开入口 */
  entries: string[];
  /** 接入步骤（按执行顺序） */
  steps: string[];
  /** 最小接入代码 */
  snippet: string;
  /** 样例文档：交给 SDK 渲染，也用作流式演示的推流正文 */
  sample: string;
}

export type ScenarioId = 'support' | 'notes' | 'docs' | 'legal';

const SUPPORT_SAMPLE = `## 售后处理结果（工单 A20261112）

您好，已核对订单与到货照片，本次按质量问题处理：**补发坐垫**，运费由我们承担。

### 处理明细

| 商品 | 数量 | 处理方式 | 预计时效 |
| :-- | --: | --- | --- |
| 人体工学椅 | 1 | 补发坐垫 | 2 个工作日 |
| 升降桌 | 1 | 上门检修 | 48 小时内联系 |

- 物流单号生成后自动推送短信，无需再次咨询；
- 若 48 小时内未收到检修联系，直接回复本消息即可升级处理。

> 依据《消费者权益保护法》第二十四条，本次按质量问题处理，不占用您七日无理由退货的额度。

如需改为**退货退款**，回复「退货」两个字即可。`;

const NOTES_SAMPLE = `## 周会纪要 · 11 月第 2 周

**时间**：2026-11-12 10:00–10:40　**主持**：李工　**参会**：8 人

### 结论

1. 结算模块灰度范围从 5% 扩到 20%，本周五前完成；
2. 导出性能问题转专项，由王小明牵头；
3. 文档站交互项（目录 / 复制 / 移动端降级）本迭代收尾。

### 待办

| 事项 | 负责人 | 截止 |
| :-- | --- | --- |
| 灰度扩量确认 | 李工 | 11-14 |
| 导出慢查询排查 | 王小明 | 11-18 |
| 验收清单补齐 | 张倩 | 11-15 |

> 下次周会 11-19 10:00，议题征集截止 11-18 18:00。`;

const DOCS_SAMPLE = `## 流式渲染时表格为什么会抖？

**结论**：把增量文本原样交给 \`StreamingMarkdown\`，表格换行规整交给渲染前预处理，
不要在业务里自己拼接表格字符串。

\`\`\`tsx
import { StreamingMarkdown } from '@tilo-ui/content-kit/markdown';

<StreamingMarkdown content={accumulated} isStreaming={busy} />;
\`\`\`

### 为什么不会抖

- 流式与静态共用同一套 remark 插件、预处理与主题作用域；
- 缺行、粘连的表格文本在渲染前被补全；
- 尾部光标是独立节点，不参与 Markdown 解析。

| 关注点 | 流式 | 静态 |
| :-- | --- | --- |
| 渲染组件 | StreamingMarkdown | MarkdownContent |
| 主题作用域 | \`--tk-*\` | \`--tk-*\` |
| 增量成本 | 只重算最后一段 | 整篇重算 |`;

const LEGAL_SAMPLE = `## 民事起诉状（示例）

**原告**：张某某，男，1990 年 3 月生，汉族，住某某市某某区。

**被告**：某某贸易有限公司，住所地某某市某某区某某路 88 号，法定代表人李某某。

### 诉讼请求

1. 判令被告支付拖欠货款人民币 **128,600 元**；
2. 判令被告支付逾期付款利息（自 2025 年 8 月 1 日起按 LPR 计算）；
3. 本案诉讼费用由被告承担。

### 事实与理由

原告与被告于 2025 年 5 月签订《产品购销合同》，约定原告向被告供应办公设备一批，
合同总价款人民币 128,600 元。原告已按约定完成交付并开具增值税发票，被告收货后
仅支付 30% 预付款，余款经多次催告仍未支付。

| 序号 | 证据名称 | 证明内容 | 页码 |
| :-- | --- | --- | ---: |
| 1 | 《产品购销合同》 | 双方买卖合同关系成立 | 3-12 |
| 2 | 增值税专用发票 | 原告已履行开票义务 | 13 |
| 3 | 微信催款记录 | 被告确认欠款并承诺付款 | 14-20 |

> 依据《中华人民共和国民法典》第五百七十七条，当事人一方不履行合同义务的，
> 应当承担继续履行、采取补救措施或者赔偿损失等违约责任。

此致

**某某市某某区人民法院**`;

export const SCENARIOS: Scenario[] = [
  {
    id: 'support',
    label: '电商售后客服',
    brief:
      'Agent 生成工单回复，边流边显示；历史工单存的是 HTML，入库前先过一遍白名单清洗。',
    entries: ['/markdown', '/content'],
    steps: [
      'Agent 的输出（Markdown）直接喂给 StreamingMarkdown，工单号一出来就先渲染',
      '历史工单、站内信这类 HTML 内容进模型前用 sanitizeHtml 剥掉脚本与事件属性',
      '回复里带的明细表按版心宽度重算列宽，避免窄屏横向滚动',
    ],
    snippet: `import { StreamingMarkdown } from '@tilo-ui/content-kit/markdown';
import { sanitizeHtml, calculateTableColumnWidths } from '@tilo-ui/content-kit/content';

// 1) 回复边生成边显示
<StreamingMarkdown content={reply} isStreaming={streaming} />;

// 2) 历史工单入库前清洗
const safe = sanitizeHtml(ticketHtml);

// 3) 明细表按版心分配列宽
const widths = calculateTableColumnWidths(rows, 640);`,
    sample: SUPPORT_SAMPLE,
  },
  {
    id: 'notes',
    label: '会议纪要',
    brief:
      '录音转写不断追加，纪要边转边成文；决议与待办是表格，宽度按版心算好。',
    entries: ['/markdown', '/content', '/tiptap'],
    steps: [
      '转写文本按片段累积，交给 StreamingMarkdown 增量渲染',
      '待办表格用列宽算法按内容密度分配，序号列不会白占宽度',
      '需要人工润色时切到 Tiptap，拖过的列宽写回文档模型的 colwidth',
    ],
    snippet: `import { StreamingMarkdown } from '@tilo-ui/content-kit/markdown';
import { calculateTableColumnWidths } from '@tilo-ui/content-kit/content';

// 转写片段持续追加
<StreamingMarkdown content={transcript} isStreaming={live} />;

// 待办表格按内容密度分配列宽
const widths = calculateTableColumnWidths(todoRows, 640);`,
    sample: NOTES_SAMPLE,
  },
  {
    id: 'docs',
    label: '技术文档问答',
    brief:
      'RAG 回答里有代码块、对比表和引用，必须整段可复制、链接默认新窗口打开。',
    entries: ['/markdown', '/convert', '/theme'],
    steps: [
      '回答交给 MarkdownContent 渲染，代码块与表格走同一套默认映射',
      '要在代码块上加「复制」只需覆盖 code / pre，其余元素沿用默认实现',
      '宿主品牌色通过 themeStyle 校验后注入 --tk-*，换肤不重建 CSS',
    ],
    snippet: `import { MarkdownContent, defaultMarkdownComponents } from '@tilo-ui/content-kit/markdown';
import { themeStyle } from '@tilo-ui/content-kit/theme';

// 只覆盖 code，其余沿用默认映射
<MarkdownContent content={answer} components={{ ...defaultMarkdownComponents, code: CodeWithCopy }} />;

// 后端下发主题变量
const { style, rejected } = themeStyle(profile.tokens);`,
    sample: DOCS_SAMPLE,
  },
  {
    id: 'legal',
    label: '法律文书',
    brief:
      '唯一带行业约束的场景：中文公文的文书名去重、层级提升、大写数字章节判定。',
    entries: ['/legal', '/markdown'],
    steps: [
      '模型常在开头重复一遍文书名，stripLeadingDocumentTitle 只切首行且要求严格全等',
      '「一、」「（一）」这类章节行由 normalizeLegalMarkdown 统一提升层级',
      '连续序数词（如「二月份」）与断句标点结尾的行不会被误判成标题',
    ],
    snippet: `import {
  normalizeLegalMarkdown,
  stripLeadingDocumentTitle,
} from '@tilo-ui/content-kit/legal';

const body = stripLeadingDocumentTitle(raw, docTitle);
const next = normalizeLegalMarkdown(body);`,
    sample: LEGAL_SAMPLE,
  },
];

export const DEFAULT_SCENARIO = SCENARIOS[0];

export function scenarioById(id: ScenarioId): Scenario {
  return SCENARIOS.find((s) => s.id === id) ?? DEFAULT_SCENARIO;
}
