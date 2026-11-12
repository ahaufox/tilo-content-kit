import { describe, expect, it } from 'vitest';
import { ensureHtml, htmlToMarkdown } from '../src/convert';
import { sanitizeHtml } from '../src/content/sanitizeHtml';
import { injectTableWidthsToHtml } from '../src/content/table-layout';

const MARKDOWN_TABLE = [
  '| 序号 | 证据名称 | 证明目的 |',
  '| --- | --- | --- |',
  '| 1 | 借款合同 | 证明双方存在借贷合意 |',
  '| 2 | 转账凭证 | 证明款项已实际交付 |',
].join('\n');

describe('表格列宽在预览链路中的保真', () => {
  it('ensureHtml 为 Markdown 表格注入 colgroup 与 colwidth', () => {
    const html = ensureHtml(MARKDOWN_TABLE);
    expect(html).toContain('<colgroup>');
    expect(html).toMatch(/<col[^>]+style="width: \d+px;"/);
    expect(html).toMatch(/colwidth='\[/);
  });

  it('sanitizeHtml 保留列宽载体（DocumentPaperView 主预览链路）', () => {
    const cleaned = sanitizeHtml(ensureHtml(MARKDOWN_TABLE));
    expect(cleaned).toContain('<colgroup');
    expect(cleaned).toContain('<col');
    expect(cleaned).toMatch(/colwidth=/);
    expect(cleaned).toMatch(/width: \d+px/);
  });

  it('已有显式 colwidth 时不被密度算法覆盖', () => {
    const original =
      '<table colwidth=\'[100,200]\'><colgroup>' +
      '<col style="width: 100px;" width="100" colwidth="100" />' +
      '<col style="width: 200px;" width="200" colwidth="200" />' +
      '</colgroup><tr><td>甲</td><td>乙</td></tr></table>';
    expect(injectTableWidthsToHtml(original)).toBe(original);
  });

  it('Markdown 往返保留表格文本，宽度由 AST 事实源另行承载', () => {
    const md = htmlToMarkdown(ensureHtml(MARKDOWN_TABLE));
    expect(md).toContain('| 序号 | 证据名称 | 证明目的 |');
    expect(md).toContain('| --- |');
    expect(md).not.toContain('colwidth');
  });

  it('放宽列宽白名单后仍阻断脚本与事件属性', () => {
    const cleaned = sanitizeHtml('<p onclick="alert(1)">安全</p><script>alert(2)</script>');
    expect(cleaned).not.toContain('onclick');
    expect(cleaned).not.toContain('<script');
  });
});
