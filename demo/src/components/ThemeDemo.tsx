/**
 * ThemeDemo — /theme 入口演示：token 白名单校验与运行时主题注入
 *
 * 交互：编辑 token 值（颜色 / 长度 / 字体族），themeStyle() 实时校验并生成
 * CSS 自定义属性注入预览容器 —— 运行时换主题无需重建 CSS。预设
 * 「非法值」演示白名单裁决：危险片段 / 非法长度 / 未知 key 逐条给出拒绝原因。
 * 本卡同时是 styles.css token 缺省声明（:root, :host）契约的直观验证：
 * 包裹层注入的 --tk-* 按继承直达内容元素。
 * font-family-* 与 page-padding-* 是 0.6.x 死键修复后的新增可用面：
 * 此前仅有缺省声明而无消费点，后端下发后静默无效。
 */
import { useMemo, useState } from 'react';
import { MarkdownContent } from '@tilo-ui/content-kit/markdown';
import { themeStyle } from '@tilo-ui/content-kit/theme';
import DemoCard from './DemoCard';
import { Toast, useToast } from './Toast';
import { Accordion } from './Accordion';
import { CodeSample } from './CodeSample';
import { SNIPPETS } from '../data/snippets';

const COLOR_KEYS = [
  'text-main',
  'text-body',
  'text-muted',
  'bg',
  'card',
  'border',
  'tertiary',
  'surface-low',
  'table-border',
] as const;

const LENGTH_KEYS = [
  { key: 'font-size-body', placeholder: '0.875rem' },
  { key: 'line-height-body', placeholder: '1.7' },
  { key: 'radius-block', placeholder: '8px' },
  { key: 'page-padding-x', placeholder: '0（缺省）/ 12mm' },
  { key: 'page-padding-y', placeholder: '0（缺省）/ 10mm' },
] as const;

const FONT_KEYS = [
  { key: 'font-family-body', placeholder: '"FangSong", serif' },
  { key: 'font-family-heading', placeholder: '缺省（宿主 --font-heading 兜底）' },
] as const;

const DARK_PRESET: Record<string, string> = {
  'text-main': '#e5e7eb',
  'text-body': '#cbd5e1',
  'text-muted': '#94a3b8',
  bg: '#0f172a',
  card: '#1e293b',
  border: '#334155',
  tertiary: '#60a5fa',
  'surface-low': '#1b2540',
  'table-border': '#334155',
};

/** 非法值预设：CSS 注入 / 声明拼接 / 未知 key，逐条触发拒绝 */
const BROKEN_PRESET: Record<string, string> = {
  bg: 'url(https://evil.example/x.png)',
  'font-size-body': '16px; color: red',
  'font-size-h1': '12 } body { display:none }',
  'unknown-key': '#ff0000',
};

const PREVIEW_DOC = `## 本月订阅账单

本期应付 **¥ 1,280.00**，账期 2026-11-01 ~ 11-30。

| 项目 | 数量 | 金额 |
| :-- | --: | --: |
| 团队席位 | 12 | 960.00 |
| 存储扩容 | 320 GB | 320.00 |

> 本预览由 MarkdownContent 渲染，token 经 themeStyle() 校验后注入本容器。`;

export function ThemeDemo() {
  const [values, setValues] = useState<Record<string, string>>({});
  const toast = useToast();

  const result = useMemo(() => themeStyle(values), [values]);

  const setToken = (key: string, value: string) => {
    setValues((prev) => {
      const next = { ...prev };
      if (value === '') delete next[key];
      else next[key] = value;
      return next;
    });
  };

  const applyPreset = (preset: 'dark' | 'light' | 'broken') => {
    if (preset === 'dark') setValues({ ...DARK_PRESET });
    else if (preset === 'light') setValues({});
    else {
      setValues({ ...BROKEN_PRESET });
      toast.show('已触发拦截');
    }
  };

  return (
    <DemoCard
      id="theme"
      entry="/theme"
      title="主题 token 契约"
      description={
        <>
          styles.css 的全部视觉声明消费 --tk-* 变量，缺省声明位于
          <code> :root, :host </code>（仅充当兜底）。themeStyle() 按白名单校验
          token 后生成可展开的 style 对象 —— 注入包裹容器即运行时生效，
          后端按规则下发配置时无需重建 CSS。
        </>
      }
    >
      <div className="demo-controls demo-actions">
        <button className="btn primary" onClick={() => applyPreset('dark')}>
          暗色预设
        </button>
        <button className="btn" onClick={() => applyPreset('light')}>
          恢复亮色
        </button>
        <span className="toast-anchor">
          <button className="btn" onClick={() => applyPreset('broken')}>
            注入非法值
          </button>
          <Toast toast={toast.toast} />
        </span>
      </div>

      <div className="token-grid">
        {COLOR_KEYS.map((key) => (
          <div className="token-field" key={key}>
            <label htmlFor={`tk-${key}`}>--tk-{key}</label>
            <input
              id={`tk-${key}`}
              value={values[key] ?? ''}
              placeholder={key === 'bg' ? '#ffffff' : '缺省（宿主变量兜底）'}
              onChange={(e) => setToken(key, e.target.value)}
              spellCheck={false}
            />
          </div>
        ))}
        {LENGTH_KEYS.map(({ key, placeholder }) => (
          <div className="token-field" key={key}>
            <label htmlFor={`tk-${key}`}>--tk-{key}</label>
            <input
              id={`tk-${key}`}
              value={values[key] ?? ''}
              placeholder={placeholder}
              onChange={(e) => setToken(key, e.target.value)}
              spellCheck={false}
            />
          </div>
        ))}
        {FONT_KEYS.map(({ key, placeholder }) => (
          <div className="token-field" key={key}>
            <label htmlFor={`tk-${key}`}>--tk-{key}</label>
            <input
              id={`tk-${key}`}
              value={values[key] ?? ''}
              placeholder={placeholder}
              onChange={(e) => setToken(key, e.target.value)}
              spellCheck={false}
            />
          </div>
        ))}
      </div>

      <div className="token-result">
        <span className="chip ok">
          生效 token: <b>{result.applied.length}</b>
        </span>
        {result.rejected.length === 0 ? (
          <span className="chip">无拒绝项</span>
        ) : (
          result.rejected.map((r) => (
            <span key={r.key} className="reject-chip" title={r.reason}>
              ✗ {r.key}: {r.value} — {r.reason}
            </span>
          ))
        )}
      </div>

      <div className="theme-preview" style={result.style}>
        <MarkdownContent content={PREVIEW_DOC} />
      </div>

      <p className="demo-note">
        「注入非法值」演示三类拒绝：url( 片段（CSS 注入）、分号声明拼接、未知
        key（不在 THEME_TOKENS 白名单）。拒绝原因会随 rejected 列表逐条返回，
        调用方应上报用于排查配置错误。
      </p>

      <div className="demo-code-ref">
        <Accordion
          id="ref-theme"
          title="代码参考"
          summary="profileFromDocumentTemplate / applyProfile 的 token 契约校验。"
        >
          <CodeSample label="/theme" code={SNIPPETS.theme} />
        </Accordion>
      </div>
    </DemoCard>
  );
}

export default ThemeDemo;
