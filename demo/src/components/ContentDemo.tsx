/**
 * ContentDemo — /content 入口演示：形态判定 + HTML 白名单清洗 + 表格列宽算法
 *
 * 三块交互：
 *   1. 形态判定——对输入文本实时运行 isHtml / isMarkdown / isBlockContent /
 *      containsDisguisedMarkdown / isHtmlSubstantivelyEmpty 纯函数判定 chips；
 *   2. sanitizeHtml——输入样例内嵌 script / iframe / onclick 等危险载荷，
 *      清洗后白名单放行安全标签并加固 a 链接；
 *   3. calculateTableColumnWidths + injectTableWidthsToHtml——演示列宽
 *      算法按内容密度分配 px 宽度并生成 <colgroup>。
 */
import { useMemo, useState } from 'react';
import {
  calculateTableColumnWidths,
  containsDisguisedMarkdown,
  injectTableWidthsToHtml,
  isBlockContent,
  isHtml,
  isHtmlSubstantivelyEmpty,
  isMarkdown,
  sanitizeHtml,
} from '@tilo-ui/content-kit/content';
import DemoCard from './DemoCard';
import { Accordion } from './Accordion';
import { CodeSample } from './CodeSample';
import { SNIPPETS } from '../data/snippets';

const DIRTY_SAMPLE = `<p onclick="steal()">重要通知</p>
<script>alert('xss')</script>
<iframe src="https://evil.example"></iframe>
<h2>和解协议要点</h2>
<p>被告应于 2026 年 1 月 31 日前支付 <b>120,000 元</b>。</p>
<a href="https://example.com/notice">查看原文</a>`;

/** 列宽算法演示输入：第一行为表头 */
const TABLE_ROWS: string[][] = [
  ['序号', '证据名称', '证明内容', '页码'],
  ['1', '《产品购销合同》', '双方买卖合同关系成立', '3-12'],
  ['2', '增值税专用发票', '原告已履行开票义务', '13'],
  ['3', '微信催款记录', '被告确认欠款并承诺付款', '14-20'],
];

const TABLE_HTML = `<table><thead><tr>${TABLE_ROWS[0]
  .map((c) => `<th>${c}</th>`)
  .join('')}</tr></thead><tbody>${TABLE_ROWS.slice(1)
  .map((row) => `<tr>${row.map((c) => `<td>${c}</td>`).join('')}</tr>`)
  .join('')}</tbody></table>`;

export function ContentDemo() {
  const [input, setInput] = useState(DIRTY_SAMPLE);
  const [sanitized, setSanitized] = useState('');
  const [totalWidth, setTotalWidth] = useState(553);

  // 形态判定 chips：纯函数，输入变更即时重算
  const verdicts = useMemo(
    () => ({
      isHtml: isHtml(input),
      isMarkdown: isMarkdown(input),
      isBlockContent: isBlockContent(input),
      containsDisguisedMarkdown: containsDisguisedMarkdown(input),
      isHtmlSubstantivelyEmpty: isHtmlSubstantivelyEmpty(input),
    }),
    [input],
  );

  const widths = useMemo(() => calculateTableColumnWidths(TABLE_ROWS, totalWidth), [totalWidth]);
  const injectedHtml = useMemo(() => injectTableWidthsToHtml(TABLE_HTML, totalWidth), [totalWidth]);

  return (
    <DemoCard
      id="content"
      entry="/content"
      title="形态判定与清洗"
      description={
        <>
          判定一段文本「是什么形态」（isHtml / isMarkdown / isBlockContent）、
          白名单清洗 HTML（script / iframe / 事件属性一律剥离），以及
          A4 版心表格列宽智能分配。全部为纯函数，窄体调用方（脚本 / Edge）零依赖可用。
        </>
      }
    >
      <div className="demo-sub">① 形态判定（随输入实时变化）</div>
      <div className="chips">
        {(
          [
            ['isHtml', verdicts.isHtml],
            ['isMarkdown', verdicts.isMarkdown],
            ['isBlockContent', verdicts.isBlockContent],
            ['containsDisguisedMarkdown', verdicts.containsDisguisedMarkdown],
            ['isHtmlSubstantivelyEmpty', verdicts.isHtmlSubstantivelyEmpty],
          ] as const
        ).map(([name, value]) => (
          <span key={name} className={`chip${value ? ' ok' : ''}`}>
            {name}: <b>{String(value)}</b>
          </span>
        ))}
      </div>

      <div className="demo-io">
        <div className="demo-io-pane">
          <span className="pane-label">输入（含危险载荷，可编辑）</span>
          <textarea
            id="content-input"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setSanitized('');
            }}
            spellCheck={false}
            rows={9}
          />
        </div>
        <div className="demo-io-pane">
          <span className="pane-label">sanitizeHtml 输出</span>
          <pre className="code-out">
            {sanitized || '点击「sanitizeHtml 清洗」执行白名单清洗'}
          </pre>
        </div>
      </div>
      <div className="demo-controls demo-actions">
        <button className="btn primary" onClick={() => setSanitized(sanitizeHtml(input))}>
          sanitizeHtml 清洗
        </button>
      </div>

      <div className="demo-sub">② 表格列宽智能分配（calculateTableColumnWidths）</div>
      <div className="range-row">
        <label htmlFor="table-width">表格总宽度</label>
        <input
          id="table-width"
          type="range"
          min={400}
          max={800}
          step={10}
          value={totalWidth}
          onChange={(e) => setTotalWidth(Number(e.target.value))}
        />
        <span className="range-value">{totalWidth}px</span>
      </div>
      <div className="chips">
        {widths.map((w, i) => (
          <span key={i} className="chip">
            第 {i + 1} 列: <b>{w}px</b>
          </span>
        ))}
      </div>

      <div className="table-preview-wrap">
        <span className="pane-label">渲染预览（列宽随总宽度实时变化）</span>
        <div className="table-preview" style={{ width: totalWidth, maxWidth: '100%' }}>
          <table style={{ tableLayout: 'fixed', width: '100%', borderCollapse: 'collapse' }}>
            <colgroup>
              {widths.map((w, i) => (
                <col key={i} style={{ width: w }} />
              ))}
            </colgroup>
            <thead>
              <tr>
                {TABLE_ROWS[0].map((c, i) => (
                  <th key={i}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TABLE_ROWS.slice(1).map((row, ri) => (
                <tr key={ri}>
                  {row.map((c, ci) => (
                    <td key={ci}>{c}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <pre className="code-out demo-code-inline">{injectedHtml}</pre>

      <p className="demo-note">
        清洗规则：script / iframe / 事件属性（onclick 等）剥离，a 标签自动补
        target=&quot;_blank&quot; 与 rel=&quot;noopener noreferrer&quot;；列宽算法按内容密度与最小宽度约束分配，
        证据名称等长文本列获得更高权重。
      </p>

      <div className="demo-code-ref">
        <Accordion
          id="ref-content"
          title="代码参考"
          summary="sanitizeHtml / 形态判定 / 表格列宽算法的最小用法。"
        >
          <CodeSample label="/content" code={SNIPPETS.content} />
        </Accordion>
      </div>
    </DemoCard>
  );
}

export default ContentDemo;
