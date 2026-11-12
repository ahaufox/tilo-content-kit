import { describe, expect, it } from 'vitest';
import { ensureHtml, htmlToMarkdown } from '../src/convert';
import { normalizeLegalMarkdown } from '../src/legal';

/**
 * 公文排版容器（<div align="center|right">）在脱壳与编辑两条链路中的对齐保真契约。
 * 后端（专案 189）标准化输出带 align 属性的 <div> 容器，前端必须：
 *   1. normalizeLegalMarkdown 脱壳时保护带 align 的容器，不误删；
 *   2. ensureHtml 进入编辑器前把 align 下沉为 style="text-align: ..."，
 *      使 Tiptap TextAlign 与纸面渲染均可识别。
 */
describe('contentUtils — 公文对齐容器保护与下沉', () => {
  it('normalizeLegalMarkdown 应保留带 align 的居中标题容器，不误脱壳', () => {
    const raw = '<div align="center">\n\n# 民事起诉状\n\n</div>';
    const normalized = normalizeLegalMarkdown(raw);
    expect(normalized).toContain('<div align="center">');
    expect(normalized).toContain('# 民事起诉状');
  });

  it('normalizeLegalMarkdown 应保留带 align 的落款右对齐容器', () => {
    const raw = '<div align="right">\n\n具状人：张三\n\n</div>';
    const normalized = normalizeLegalMarkdown(raw);
    expect(normalized).toContain('<div align="right">');
    expect(normalized).toContain('具状人：张三');
  });

  it('normalizeLegalMarkdown 应剥离无 align 的整篇 HTML 外壳（回归）', () => {
    const raw = '<div class="editor-content">\n\n# 标题\n\n正文\n\n</div>';
    const normalized = normalizeLegalMarkdown(raw);
    expect(normalized).not.toContain('<div');
    expect(normalized).toContain('# 标题');
  });

  it('ensureHtml 应将居中标题对齐下沉为 style="text-align: center"', () => {
    const html = ensureHtml('<div align="center">\n\n# 民事起诉状\n\n</div>');
    expect(html).toContain('<h1');
    expect(html).toContain('text-align: center');
    expect(html).not.toContain('<div align="center">');
  });

  it('ensureHtml 应将落款右对齐下沉为 style="text-align: right"（纯 HTML 路径）', () => {
    const html = ensureHtml('<div align="right">\n\n具状人：张三\n\n</div>');
    expect(html).toContain('text-align: right');
    expect(html).toContain('具状人：张三');
    expect(html).not.toContain('<div align="right">');
  });

  it('ensureHtml 应将多段落落款逐段下沉右对齐（Markdown 路径）', () => {
    const html = ensureHtml('<div align="right">\n\n此致\n\n人民法院\n\n</div>');
    expect(html).toContain('text-align: right');
    expect(html).toContain('此致');
    expect(html).toContain('人民法院');
  });

  it('htmlToMarkdown 应将居中标题反向序列化为 <div align="center"> 容器', () => {
    const html = '<h1 style="text-align: center">民事起诉状</h1><p>正文内容</p>';
    const md = htmlToMarkdown(html);
    expect(md).toContain('<div align="center">');
    expect(md).toContain('# 民事起诉状');
    expect(md).toContain('正文内容');
  });

  it('htmlToMarkdown 应将右对齐落款反向序列化为 <div align="right"> 容器，保证往返不丢失', () => {
    const html = '<p>事实与理由</p><p style="text-align: right">具状人：张三</p><p style="text-align: right">2026年11月10日</p>';
    const md = htmlToMarkdown(html);
    expect(md).toContain('<div align="right">');
    expect(md).toContain('具状人：张三');
    expect(md).toContain('2026年11月10日');

    // 闭环验证：经 htmlToMarkdown 生成的 Markdown 再送入 ensureHtml 仍可准确还原对齐
    const roundTripHtml = ensureHtml(md);
    expect(roundTripHtml).toContain('text-align: right');
  });
});
