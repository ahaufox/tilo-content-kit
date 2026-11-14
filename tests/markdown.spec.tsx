// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  MarkdownContent,
  StreamingMarkdown,
  defaultMarkdownClassName,
  defaultMarkdownComponents,
  defaultRemarkPlugins,
  preprocessMarkdown,
} from '../src/markdown';

describe('MarkdownContent — 静态渲染', () => {
  it('渲染标题与正文', () => {
    render(<MarkdownContent content={'# 标题\n\n正文段落。'} />);
    expect(screen.getByRole('heading', { level: 1, name: '标题' })).toBeInTheDocument();
    expect(screen.getByText('正文段落。')).toBeInTheDocument();
  });

  it('渲染 GFM 表格（列头与单元格）', () => {
    render(<MarkdownContent content={'| 列1 | 列2 |\n|---|---|\n| A | B |'} />);
    expect(screen.getByRole('columnheader', { name: '列1' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'A' })).toBeInTheDocument();
  });

  it('渲染代码块', () => {
    render(<MarkdownContent content={'```\nconst x = 1;\n```'} />);
    expect(screen.getByText('const x = 1;')).toBeInTheDocument();
  });

  it('代码块渲染 <pre><code> 结构（非 inline）', () => {
    const { container } = render(<MarkdownContent content={'```\nconst x = 1;\n```'} />);
    expect(container.querySelector('pre')).toBeInTheDocument();
    expect(container.querySelector('code')).toBeInTheDocument();
  });

  it('行内代码不渲染 <pre>', () => {
    const { container } = render(<MarkdownContent content={'这是 `inline` 代码'} />);
    expect(container.querySelector('pre')).toBeNull();
  });

  it('默认根容器挂 tk-content 主题作用域（不依赖 Tailwind）', () => {
    const { container } = render(<MarkdownContent content="正文" />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain('tk-content');
    expect(root.className).not.toContain('prose');
  });

  it('表格输出 tk-table-wrap 包裹层（横向滚动容器）', () => {
    const { container } = render(<MarkdownContent content={'| A | B |\n|---|---|\n| 1 | 2 |'} />);
    const wrap = container.querySelector('.tk-table-wrap');
    expect(wrap).toBeInTheDocument();
    expect(wrap?.querySelector('table')).toBeInTheDocument();
  });

  it('合并自定义 className', () => {
    const { container } = render(<MarkdownContent content="正文" className="custom-x" />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain('custom-x');
  });

  it('空字符串渲染空容器（空态交由宿主处理）', () => {
    const { container } = render(<MarkdownContent content="" />);
    expect(container.firstElementChild).toBeEmptyDOMElement();
  });
});

describe('StreamingMarkdown — 增量渲染', () => {
  it('渲染累积内容', () => {
    render(<StreamingMarkdown content={'# 流式\n\n内容'} />);
    expect(screen.getByRole('heading', { level: 1, name: '流式' })).toBeInTheDocument();
  });

  it('isStreaming 时显示尾部光标', () => {
    render(<StreamingMarkdown content="内容" isStreaming />);
    expect(screen.getByTestId('streaming-cursor')).toBeInTheDocument();
  });

  it('非流式时隐藏光标', () => {
    render(<StreamingMarkdown content="内容" isStreaming={false} />);
    expect(screen.queryByTestId('streaming-cursor')).not.toBeInTheDocument();
  });
});

describe('/markdown 共享构件契约', () => {
  it('defaultRemarkPlugins 含 gfm 与 htmlBreaks', () => {
    expect(defaultRemarkPlugins.length).toBe(2);
  });

  it('defaultMarkdownComponents 提供表格/代码/链接映射', () => {
    expect(defaultMarkdownComponents.table).toBeTypeOf('function');
    expect(defaultMarkdownComponents.code).toBeTypeOf('function');
    expect(defaultMarkdownComponents.a).toBeTypeOf('function');
  });

  it('defaultMarkdownClassName 已置空（排版基线改由随包 CSS 承担）', () => {
    expect(defaultMarkdownClassName).toBe('');
  });

  it('preprocessMarkdown 规整粘连表格', () => {
    const messy = '文本\n| 列1 | 列2 ||---|---|\n| A | B |';
    const out = preprocessMarkdown(messy);
    expect(out).toContain('\n|');
  });

  it('表格单元格内的各类 <br>、<br >、&lt;br&gt; 均渲染为原生 br 换行且不裸露文本', () => {
    const markdownWithBrs = `
| 潜在抗辩 | 应对策略与法律依据 |
| --- | --- |
| 非借贷关系抗辩<br>（如辩称系合伙投资、货款等） | 应对：要求书面证据。<br>依据：审理民间借贷规定。 |
| 诉讼时效抗辩<br >（如辩称已过时效） | 应对：重点展示微信催款记录。<br />依据：时效中断。 |
| 金额异议&lt;br&gt;（如辩称已还部分款项） | 应对：要求还款凭证。<br></br>目前无记录。 |
`;
    const { container } = render(<MarkdownContent content={markdownWithBrs} />);
    const brList = container.querySelectorAll('table td br');
    expect(brList.length).toBeGreaterThanOrEqual(6);

    const cellText = container.textContent || '';
    expect(cellText).not.toContain('<br>');
    expect(cellText).not.toContain('<br >');
    expect(cellText).not.toContain('&lt;br&gt;');
    expect(cellText).not.toContain('</br>');

    expect(screen.getByText(/非借贷关系抗辩/)).toBeInTheDocument();
    expect(screen.getByText(/（如辩称系合伙投资、货款等）/)).toBeInTheDocument();
  });
});
