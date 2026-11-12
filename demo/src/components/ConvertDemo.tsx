/**
 * ConvertDemo — /convert 入口演示：Markdown ⇄ HTML 双向转换
 *
 * 交互：切换样例输入（HTML 站内信 / Markdown 工单备注），点击函数按钮调用
 * ensureHtml / ensureInlineHtml / htmlToMarkdown 真实导出函数，输出区实时
 * 展示转换结果。三个函数均为零 DOM 依赖的纯函数，可在 Node / Edge 直接调用。
 * 样例取日常业务内容（售后工单 / 站内信），不绑定任何行业。
 */
import { useState } from 'react';
import { ensureHtml, ensureInlineHtml, htmlToMarkdown } from '@tilo-ui/content-kit/convert';
import DemoCard from './DemoCard';
import { SplitPanes } from './SplitPanes';
import { Tabs } from './Tabs';
import { Accordion } from './Accordion';
import { CodeSample } from './CodeSample';
import { SNIPPETS } from '../data/snippets';

const MARKDOWN_SAMPLE = `**用户**：陈女士，金卡会员，近 30 天下单 4 次。

诉求：人体工学椅坐垫塌陷，希望 **补发** 而非退货。

| 订单号 | 商品 | 状态 |
| :-- | --- | --- |
| A20261112 | 人体工学椅 | 已补发 |`;

const HTML_SAMPLE = `<h2>工单 A20261112 处理结果</h2>
<p>已核对到货照片，本次按质量问题处理：<strong>补发坐垫</strong>，运费由我们承担。</p>
<p>物流单号生成后自动推送短信，无需再次咨询。</p>`;

type Action = 'ensureHtml' | 'ensureInlineHtml' | 'htmlToMarkdown';

const ACTIONS: Array<{ key: Action; label: string; hint: string }> = [
  { key: 'ensureHtml', label: 'ensureHtml', hint: '任意输入 → 块级 HTML（编辑器块上下文）' },
  { key: 'ensureInlineHtml', label: 'ensureInlineHtml', hint: '纯文本 → 行内 HTML（选区内联上下文，不额外包裹块标签）' },
  { key: 'htmlToMarkdown', label: 'htmlToMarkdown', hint: 'HTML → Markdown（Word 粘贴、历史工单入库）' },
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
          HTML → Markdown（Word 粘贴 / 历史工单入库）。切换样例后点击函数按钮，
          输入文本可直接编辑 —— 样例是日常售后工单，与行业无关。
        </>
      }
    >
      <div className="demo-toolbar">
        <Tabs
          items={[
            { id: 'html', label: 'HTML 站内信' },
            { id: 'markdown', label: 'Markdown 备注' },
          ]}
          value={sample}
          onChange={switchSample}
          label="样例类型"
        />
      </div>

      <SplitPanes
        label="转换输入输出"
        panes={[
          {
            id: 'input',
            label: '输入',
            className: 'demo-io-pane',
            content: (
              <>
                <span className="pane-label">输入</span>
                <textarea
                  id="convert-input"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  spellCheck={false}
                  rows={9}
                />
              </>
            ),
          },
          {
            id: 'output',
            label: '输出',
            className: 'demo-io-pane',
            content: (
              <>
                <span className="pane-label">输出</span>
                <pre className="code-out">{output || '点击下方函数按钮执行转换'}</pre>
              </>
            ),
          },
        ]}
      />

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
        转换是双向的：入库前转 Markdown，编辑器里转回 HTML，同一份内容不必存两遍。
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
