/**
 * LegalDemo — /legal 入口演示：法律文书 Markdown 规则
 *
 * 交互：以「民事起诉状」样例为输入，通过三个开关组合运行
 * stripLeadingDocumentTitle（首行文书名去重）、boldLegalSectionHeadings
 * （段落小标题加粗）与 normalizeLegalMarkdown（整体归一化，含脱壳 /
 * Setext 防误判 / 章节层级提升），输出 Markdown 源码与渲染效果双视图；
 * 另以固定探针行展示 isLegalChapterHeading 的判定边界。
 */
import { useMemo, useState } from 'react';
import { MarkdownContent } from '@tilo-ui/content-kit/markdown';
import {
  boldLegalSectionHeadings,
  isLegalChapterHeading,
  normalizeLegalMarkdown,
  stripLeadingDocumentTitle,
} from '@tilo-ui/content-kit/legal';
import DemoCard from './DemoCard';
import { SplitPanes } from './SplitPanes';
import { Accordion } from './Accordion';
import { CodeSample } from './CodeSample';
import { SNIPPETS } from '../data/snippets';

const LEGAL_SAMPLE = `# 民事起诉状

**原告**：张某某，男，1990 年 3 月生，住某某市某某区。

诉讼请求：
一、判令被告支付货款
二、判令被告承担诉讼费用

事实与理由：
原告与被告于 2025 年 5 月签订《产品购销合同》。
二月份市场行情波动不影响合同履行。`;

/** isLegalChapterHeading 判定边界探针（覆盖 正例 / 连续序数词 / 断句标点） */
const CHAPTER_PROBES = [
  '一、判令被告支付货款',
  '二月份市场行情波动',
  '三、判令被告支付货款。',
  '四、证据清单',
];

export function LegalDemo() {
  const [input, setInput] = useState(LEGAL_SAMPLE);
  const [docTitle, setDocTitle] = useState('民事起诉状');
  const [strip, setStrip] = useState(true);
  const [bold, setBold] = useState(true);
  const [normalize, setNormalize] = useState(false);

  const output = useMemo(() => {
    let text = input;
    if (strip) text = stripLeadingDocumentTitle(text, docTitle);
    if (normalize) {
      text = normalizeLegalMarkdown(text);
    } else if (bold) {
      text = boldLegalSectionHeadings(text);
    }
    return text;
  }, [input, docTitle, strip, bold, normalize]);

  return (
    <DemoCard
      id="legal"
      entry="/legal"
      title="法律文书规则"
      description={
        <>
          全站唯一带行业约束的入口：只对中文公文书写习惯成立。首行文书名去重、
          独立成行的「诉讼请求：」等段落小标题加粗、大写数字章节行（一、二、……）
          精准提升为标题——连续序数词（如「二月份」）与断句标点结尾不误伤。
          不做法律业务时，跳过这个入口即可，其余六个入口与行业无关。
        </>
      }
    >
      <SplitPanes
        label="法律规则输入与开关"
        panes={[
          {
            id: 'input',
            label: '输入',
            className: 'demo-io-pane',
            content: (
              <>
                <span className="pane-label">输入（可编辑）</span>
                <textarea
                  id="legal-input"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  spellCheck={false}
                  rows={11}
                />
                <span className="pane-label">文书名（stripLeadingDocumentTitle 比对基准）</span>
                <input
                  id="legal-doc-title"
                  className="inline-input"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                />
              </>
            ),
          },
          {
            id: 'rules',
            label: '规则与结果',
            className: 'demo-io-pane',
            content: (
              <>
                <span className="pane-label">规则开关</span>
                <label className="switch-row">
                  <input
                    type="checkbox"
                    checked={strip}
                    onChange={(e) => setStrip(e.target.checked)}
                  />
                  去重首行文书名（stripLeadingDocumentTitle）
                </label>
                <label className="switch-row">
                  <input
                    type="checkbox"
                    checked={bold && !normalize}
                    disabled={normalize}
                    onChange={(e) => setBold(e.target.checked)}
                  />
                  段落小标题加粗（boldLegalSectionHeadings）
                </label>
                <label className="switch-row">
                  <input
                    type="checkbox"
                    checked={normalize}
                    onChange={(e) => setNormalize(e.target.checked)}
                  />
                  整体归一化（normalizeLegalMarkdown，含小标题加粗与章节提升）
                </label>
                <span className="pane-label">处理结果（Markdown 源码）</span>
                <pre className="code-out">{output}</pre>
              </>
            ),
          },
        ]}
      />

      <div className="demo-sub">渲染效果（MarkdownContent，随上方规则实时更新）</div>
      <div className="legal-preview">
        <MarkdownContent content={output} />
      </div>

      <div className="demo-sub">isLegalChapterHeading 判定边界</div>
      <div className="chips">
        {CHAPTER_PROBES.map((probe) => (
          <span key={probe} className={`chip${isLegalChapterHeading(probe) ? ' ok' : ''}`}>
            {isLegalChapterHeading(probe) ? '✓' : '✗'} {probe}
          </span>
        ))}
      </div>

      <p className="demo-note">
        与行业无关的用法见上方「按场景接入」：售后客服、会议纪要、技术文档都不用这条规则。
        「二月份市场行情波动」被连续序数词排除；「三、判令被告支付货款。」因句末断句标点被排除；
        章节行仅在其为独立公文层级标题时提升，避免把普通句子误判为标题。
      </p>

      <div className="demo-code-ref">
        <Accordion
          id="ref-legal"
          title="代码参考"
          summary="stripLeadingDocumentTitle / normalizeLegalMarkdown 的最小用法。"
        >
          <CodeSample label="/legal" code={SNIPPETS.legal} />
        </Accordion>
      </div>
    </DemoCard>
  );
}

export default LegalDemo;
