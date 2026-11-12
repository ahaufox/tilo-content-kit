/**
 * ConvertDemo — /convert 入口演示：Markdown ⇄ HTML 双向转换
 *
 * 交互：切换样例输入（HTML / Markdown），点击函数按钮调用 ensureHtml /
 * ensureInlineHtml / htmlToMarkdown 真实导出函数，输出区实时展示转换结果。
 * 三个函数均为零 DOM 依赖的纯函数，可在 Node / Edge 运行时直接调用。
 */
import { useState } from 'react';
import { ensureHtml, ensureInlineHtml, htmlToMarkdown } from '@tilo-ui/content-kit/convert';
import DemoCard from './DemoCard';
import { Accordion } from './Accordion';
import { CodeSample } from './CodeSample';
import { SNIPPETS } from '../data/snippets';

const MARKDOWN_SAMPLE = `**原告**：张某某，男，住某某市某某区。

被告欠付货款 **128,600 元**，经多次催告仍未支付。

| 序号 | 证据名称 | 页码 |
| :-- | --- | ---: |
| 1 | 《产品购销合同》 | 3-12 |`;

const HTML_SAMPLE = `<h2>和解协议要点</h2>
<p>被告应于 2026 年 1 月 31 日前支付 <strong>120,000 元</strong>。</p>
<p>原告不再就本次争议追究其他责任。</p>`;

type Action = 'ensureHtml' | 'ensureInlineHtml' | 'htmlToMarkdown';

const ACTIONS: Array<{ key: Action; label: string; hint: string }> = [
  { key: 'ensureHtml', label: 'ensureHtml', hint: '任意输入 → 块级 HTML（编辑器块上下文）' },
  { key: 'ensureInlineHtml', label: 'ensureInlineHtml', hint: '纯文本 → 行内 HTML（选区内联上下文，不额外包裹块标签）' },
  { key: 'htmlToMarkdown', label: 'htmlToMarkdown', hint: 'HTML → Markdown（Word 粘贴回写等场景）' },
];

export function ConvertDemo() {
  const [input, setInput] = useState(HTML_SAMPLE);
  const [sample, setSample] = useState<'html' | 'markdown'>('html');
  const [output, setOutput] = useState('');
  const [active, setActive] = useState<Action | null>(null);

  const switchSample = (kind: 'html' | 'markdown') => {
    setSample(kind);
    setInput(kind === 'html' ? HTML_SAMPLE : MARKDOWN_SAMPLE);
    setOutput('');
    setActive(null);
  };

  const run = (action: Action) => {
    setActive(action);
    if (action === 'ensureHtml') setOutput(ensureHtml(input));
    if (action === 'ensureInlineHtml') setOutput(ensureInlineHtml(input));
    if (action === 'htmlToMarkdown') setOutput(htmlToMarkdown(input));
  };

  return (
    <DemoCard
      id="convert"
      entry="/convert"
      title="双向转换"
      description={
        <>
          marked + turndown 双引擎：Markdown → HTML（编辑器富文本上下文）与
          HTML → Markdown（Word 粘贴 / 协同回写）。切换样例后点击函数按钮，
          输入文本可直接编辑。
        </>
      }
    >
      <div className="demo-toolbar">
        <div className="demo-tabs" role="tablist">
          <button
            role="tab"
            aria-selected={sample === 'html'}
            className={sample === 'html' ? 'demo-tab active' : 'demo-tab'}
            onClick={() => switchSample('html')}
          >
            HTML 样例
          </button>
          <button
            role="tab"
            aria-selected={sample === 'markdown'}
            className={sample === 'markdown' ? 'demo-tab active' : 'demo-tab'}
            onClick={() => switchSample('markdown')}
          >
            Markdown 样例
          </button>
        </div>
      </div>

      <div className="demo-io">
        <div className="demo-io-pane">
          <span className="pane-label">输入</span>
          <textarea
            id="convert-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            spellCheck={false}
            rows={9}
          />
        </div>
        <div className="demo-io-pane">
          <span className="pane-label">输出</span>
          <pre className="code-out">{output || '点击下方函数按钮执行转换'}</pre>
        </div>
      </div>

      <div className="demo-controls demo-actions">
        {ACTIONS.map((a) => (
          <button
            key={a.key}
            className={active === a.key ? 'btn primary' : 'btn'}
            title={a.hint}
            onClick={() => run(a.key)}
          >
            {a.label}
          </button>
        ))}
      </div>

      <p className="demo-note">
        HTML 样例适合演示 htmlToMarkdown；Markdown 样例适合演示 ensureHtml /
        ensureInlineHtml 的上下文差异（块级包裹 vs 行内不额外包裹）。
      </p>

      <div className="demo-code-ref">
        <Accordion
          id="ref-convert"
          title="代码参考"
          summary="ensureHtml / ensureInlineHtml / htmlToMarkdown 的最小用法。"
        >
          <CodeSample label="/convert" code={SNIPPETS.convert} />
        </Accordion>
      </div>
    </DemoCard>
  );
}

export default ConvertDemo;
