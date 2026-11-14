import { describe, expect, it } from 'vitest';
import { ensureHtml, htmlToMarkdown } from '../src/convert';

/**
 * 行内文字颜色标注（核对提醒红色高亮）在 HTML → Markdown 双轨通道中的保真契约。
 *
 * 编辑器 Tiptap（TextStyle + Color）以 <span style="color:..."> 承载文字颜色；
 * htmlToMarkdown 必须把颜色 span 保留为同样式标签，供 Word 导出解析器
 * （tilo-export docx_inline_parser）映射为红色字体 Run，保证纸质打印与
 * 本地编辑核对提醒效果不丢失。
 */
describe('htmlToMarkdown — 行内颜色标注保真', () => {
  it('红色 span 应原样保留为 Markdown 行内颜色标签', () => {
    const html = '<p>借款事由：<span style="color:red">被告借款未还</span>，请核对。</p>';
    const md = htmlToMarkdown(html);
    expect(md).toContain('<span style="color:red">被告借款未还</span>');
    expect(md).toContain('借款事由：');
  });

  it('hex 颜色 span 应保留色值，往返 ensureHtml 不丢失', () => {
    const html = '<p><span style="color:#FF0000">重点核对</span></p>';
    const md = htmlToMarkdown(html);
    expect(md).toContain('<span style="color:#FF0000">重点核对</span>');

    const backHtml = ensureHtml(md);
    expect(backHtml).toContain('color');
    expect(backHtml).toContain('重点核对');
  });

  it('无颜色的 span 不应用颜色规则（保持默认剥除行为）', () => {
    const html = '<p><span class="plain">普通片段</span></p>';
    const md = htmlToMarkdown(html);
    expect(md).toContain('普通片段');
    expect(md).not.toContain('color');
  });
});
