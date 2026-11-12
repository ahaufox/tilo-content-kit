/**
 * ScenarioSection — 按场景接入（跨行业的解决方案样例）
 *
 * 站点的能力演示如果全是法律文书，读起来就像「只服务法律行业」。本节把同一套
 * 公开入口落到四类日常场景上：电商售后客服、会议纪要、技术文档问答、法律文书。
 * 每个场景给出「用到哪些入口 / 怎么接 / 最小代码」，右侧样例文档由本站 SDK 的
 * MarkdownContent 现场渲染 —— 既是解决方案说明，也是渲染效果的真实样例。
 */
import { useState } from 'react';
import { MarkdownContent } from '@tilo-ui/content-kit/markdown';
import { SplitPanes } from './SplitPanes';
import { Tabs } from './Tabs';
import { CodeSample } from './CodeSample';
import { SCENARIOS, type ScenarioId } from '../data/scenarios';

export function ScenarioSection() {
  const [active, setActive] = useState<ScenarioId>(SCENARIOS[0].id);
  const scenario = SCENARIOS.find((s) => s.id === active) ?? SCENARIOS[0];

  return (
    <section id="scenarios" className="section">
      <div className="section-head">
        <h2>按场景接入</h2>
        <p className="section-sub">
          同一套入口，换个行业就是另一套方案。下面四个场景都只用到公开 API，右侧样例文档由本站 SDK
          实时渲染 —— 不是截图，也不是静态 HTML。
        </p>
      </div>

      <div className="demo-card">
        <div className="demo-toolbar">
          <Tabs
            items={SCENARIOS.map((s) => ({ id: s.id, label: s.label }))}
            value={active}
            onChange={setActive}
            label="业务场景"
          />
        </div>

        <SplitPanes
          label="场景说明与样例"
          panes={[
            {
              id: 'plan',
              label: '怎么接',
              className: 'scenario-pane',
              content: (
                <>
                  <p className="scenario-brief">{scenario.brief}</p>
                  <div className="chips">
                    {scenario.entries.map((entry) => (
                      <span key={entry} className="chip ok">
                        <b>{entry}</b>
                      </span>
                    ))}
                  </div>
                  <span className="pane-label">接入步骤</span>
                  <ol className="scenario-steps">
                    {scenario.steps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                  <CodeSample label="最小接入" code={scenario.snippet} />
                </>
              ),
            },
            {
              id: 'sample',
              label: '样例文档',
              className: 'scenario-pane',
              content: (
                <>
                  <span className="pane-label">
                    {scenario.label}样例 —— MarkdownContent 渲染
                  </span>
                  <div className="scenario-doc">
                    <MarkdownContent content={scenario.sample} />
                  </div>
                </>
              ),
            },
          ]}
        />

        <p className="demo-note">
          四个场景共用同一套组件与纯函数；差异只在业务自己的提示词、字段与预处理。
          /legal 是唯一带行业约束的入口（只对中文公文书写习惯成立），其余入口与行业无关。
        </p>
      </div>
    </section>
  );
}

export default ScenarioSection;
