/**
 * DemoSection — 在线交互式演示（/markdown 入口）
 *
 * 模拟 Agent SSE 推流：把样例文档切成 token 片段，用 setInterval 逐片喂给
 * StreamingMarkdown（isStreaming 驱动尾部光标）；静态渲染走 MarkdownContent。
 * 面板主题通过 themeStyle() 注入 --tk-* 变量实现亮/暗切换，展示 token 契约。
 *
 * 推流正文可在四个业务场景间切换（data/scenarios）：售后客服 / 会议纪要 /
 * 技术文档问答 / 法律文书 —— 渲染能力与行业无关，换的是文案。
 */
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { MarkdownContent, StreamingMarkdown } from '@tilo-ui/content-kit/markdown';
import { CONTENT_KIT_VERSION, themeStyle } from '@tilo-ui/content-kit/theme';
import { tokenizeForDemo } from './sample';
import { SCENARIOS, type ScenarioId } from './data/scenarios';
import DemoCard from './components/DemoCard';
import { Tabs } from './components/Tabs';
import { Accordion } from './components/Accordion';
import { CodeSample } from './components/CodeSample';
import { SNIPPETS } from './data/snippets';

const SPEED_OPTIONS = [
  { label: '慢速', value: 60 },
  { label: '常速', value: 30 },
  { label: '极速', value: 12 },
] as const;

/** 暗色主题 token 集（key 为 THEME_TOKENS 白名单键，即去掉 --tk- 前缀） */
const DARK_TOKENS = {
  'text-main': '#e5e7eb',
  'text-body': '#cbd5e1',
  'text-muted': '#94a3b8',
  bg: '#0f172a',
  card: '#1e293b',
  border: '#334155',
  tertiary: '#60a5fa',
  'surface-low': '#1b2540',
  'table-border': '#334155',
} as const;

type Mode = 'streaming' | 'static';

export function DemoSection() {
  const [scenarioId, setScenarioId] = useState<ScenarioId>(SCENARIOS[0].id);
  const scenario = SCENARIOS.find((s) => s.id === scenarioId) ?? SCENARIOS[0];
  const chunks = useMemo(() => tokenizeForDemo(scenario.sample), [scenario.sample]);
  const [mode, setMode] = useState<Mode>('streaming');
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<number>(SPEED_OPTIONS[1].value);
  const [emitted, setEmitted] = useState(0);
  const [dark, setDark] = useState(false);

  const done = emitted >= chunks.length;
  const isStreaming = playing && !done;
  const text = useMemo(() => chunks.slice(0, emitted).join(''), [chunks, emitted]);

  // 流式推进：playing 且未播完时按 speed 节奏逐片追加；播完自动清定时器
  useEffect(() => {
    if (!playing || done) return;
    const timer = window.setInterval(() => {
      setEmitted((prev) => Math.min(prev + 1, chunks.length));
    }, speed);
    return () => window.clearInterval(timer);
  }, [playing, done, speed, chunks.length]);

  // 切场景：换正文并回到待开始状态，避免新旧片段串在一起
  const onScenarioChange = (id: ScenarioId) => {
    setScenarioId(id);
    setPlaying(false);
    setEmitted(0);
  };

  const onPlayClick = () => {
    if (done) {
      setEmitted(0);
      setPlaying(true);
      return;
    }
    setPlaying((prev) => !prev);
  };

  const onReset = () => {
    setPlaying(false);
    setEmitted(0);
  };

  // 亮色不注入 token（回落到 styles.css 内置兜底）；暗色注入 DARK_TOKENS。
  // token 缺省声明位于 styles.css 的 :root, :host，包裹层注入的 --tk-* 按
  // 继承直达 .tk-content，无需再提供去前缀变量（CSS 契约有测试锁定）。
  const themeResult = useMemo(() => themeStyle(dark ? DARK_TOKENS : {}), [dark]);

  const progress = Math.round((emitted / chunks.length) * 100);

  return (
    <DemoCard
      id="demo"
      entry="/markdown"
      title="流式 Markdown 渲染"
      description={
        <>
          模拟 Agent SSE 推流：样例文档按 token 分片逐片渲染，可切换四个业务场景。渲染容器为
          <code> @tilo-ui/content-kit/markdown </code>
          的 StreamingMarkdown / MarkdownContent（v{CONTENT_KIT_VERSION}），主题切换由
          <code> themeStyle() </code>校验 token 后写入 --tk-* 变量驱动。
        </>
      }
    >
      <div className="demo-toolbar">
        <Tabs
          items={SCENARIOS.map((s) => ({ id: s.id, label: s.label }))}
          value={scenarioId}
          onChange={onScenarioChange}
          label="推流场景"
        />
        <Tabs
          items={[
            { id: 'streaming', label: '流式渲染' },
            { id: 'static', label: '静态渲染' },
          ]}
          value={mode}
          onChange={setMode}
          label="渲染模式"
        />

        <div className="demo-controls">
          <select
            id="stream-speed"
            aria-label="推流速度"
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="demo-select"
          >
            {SPEED_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <button className="btn" onClick={onPlayClick} disabled={mode === 'static'}>
            {mode === 'static' ? '静态全文' : done ? '重播' : playing ? '暂停' : '开始推流'}
          </button>
          <button className="btn ghost" onClick={onReset} disabled={mode === 'static'}>
            重置
          </button>
          <button className="btn ghost" onClick={() => setDark((prev) => !prev)}>
            {dark ? '亮色' : '暗色'}
          </button>
        </div>
      </div>

      {mode === 'streaming' && (
        <div className="demo-progress" aria-live="off">
          <div className="demo-progress-bar">
            <div className="demo-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <span className="demo-progress-text">
            {done ? '推流完成' : isStreaming ? '推流中' : '待开始'} · {emitted}/{chunks.length} 片
          </span>
        </div>
      )}

      <div
        className={`demo-panel${dark ? ' dark' : ''}`}
        style={themeResult.style as CSSProperties}
        data-testid="demo-panel"
      >
        {mode === 'streaming' ? (
          <StreamingMarkdown content={text} isStreaming={isStreaming} />
        ) : (
          <MarkdownContent content={scenario.sample} />
        )}
      </div>

      <p className="demo-note">
        流式与静态共用同一套 remark 插件、预处理与主题样式 —— 切换模式可见渲染结果完全一致，不会漂移。
        切换场景只是换输入文案，组件与配置一行不改。
      </p>

      <div className="demo-code-ref">
        <Accordion
          id="ref-markdown"
          title="代码参考"
          summary="StreamingMarkdown / MarkdownContent 的最小用法。"
        >
          <CodeSample label="/markdown" code={SNIPPETS.stream} />
        </Accordion>
      </div>
    </DemoCard>
  );
}

export default DemoSection;
