import { describe, it, expect } from 'vitest';
import { sanitizeHtml } from '../src/content/sanitizeHtml';

describe('sanitizeHtml - 标签与属性白名单安全清洗', () => {
  it('保留合法公文富文本结构化标签与文本内容', () => {
    const input = `
      <h1>起诉状</h1>
      <p>原告与被告民间借贷纠纷一案，<strong>事实清楚</strong>，<em>证据确实充分</em>。</p>
      <table>
        <thead>
          <tr><th>序号</th><th>证据名称</th></tr>
        </thead>
        <tbody>
          <tr><td>1</td><td>借据扫描件</td></tr>
        </tbody>
      </table>
      <blockquote>本院认为：借贷关系依法成立。</blockquote>
    `;
    const clean = sanitizeHtml(input);
    expect(clean).toContain('<h1>起诉状</h1>');
    expect(clean).toContain('<strong>事实清楚</strong>');
    expect(clean).toContain('<em>证据确实充分</em>');
    expect(clean).toContain('<table>');
    expect(clean).toContain('<td>借据扫描件</td>');
    expect(clean).toContain('<blockquote>本院认为：借贷关系依法成立。</blockquote>');
  });

  it('彻底剥离 <script>、<style>、<iframe> 等危险嵌入标签及其内容', () => {
    const dangerousInput = `
      <p>合法段落</p>
      <script>alert("xss")</script>
      <style>body { display: none !important; }</style>
      <iframe src="https://attacker.example.com"></iframe>
      <object data="evil.swf"></object>
      <embed src="evil.pdf">
    `;
    const clean = sanitizeHtml(dangerousInput);
    expect(clean).toContain('<p>合法段落</p>');
    expect(clean).not.toContain('<script');
    expect(clean).not.toContain('alert("xss")');
    expect(clean).not.toContain('<style');
    expect(clean).not.toContain('display: none');
    expect(clean).not.toContain('<iframe');
    expect(clean).not.toContain('<object');
    expect(clean).not.toContain('<embed');
  });

  it('剥离各类 on* 事件属性（<img onerror>, <button onclick> 等）', () => {
    const dirty = '<img src="https://example.com/logo.png" onerror="alert(1)" onload="fetch(\'/leak\')" alt="测试图片">';
    const clean = sanitizeHtml(dirty);
    expect(clean).toContain('src="https://example.com/logo.png"');
    expect(clean).toContain('alt="测试图片"');
    expect(clean).not.toContain('onerror');
    expect(clean).not.toContain('onload');
    expect(clean).not.toContain('alert');
  });

  it('阻断 javascript: 伪协议（含空白与大小写变形）', () => {
    const dirty1 = '<a href="javascript:alert(1)">点击查看</a>';
    const dirty2 = '<a href="  JAVASCRIPT:alert(document.cookie)  ">恶意链接</a>';
    const clean1 = sanitizeHtml(dirty1);
    const clean2 = sanitizeHtml(dirty2);
    expect(clean1).not.toContain('javascript:');
    expect(clean1).not.toContain('alert(1)');
    expect(clean2).not.toContain('JAVASCRIPT:');
    expect(clean2).not.toContain('document.cookie');
  });

  it('阻断 HTML 实体混淆伪协议（如 jav&#x61;script:）', () => {
    const dirty = '<a href="jav&#x61;script:alert(1)">混淆链接</a>';
    const clean = sanitizeHtml(dirty);
    expect(clean).not.toContain('alert(1)');
    expect(clean).not.toContain('jav&#x61;script:');
  });

  it('阻断 data:text/html 等危险 mime 伪协议', () => {
    const dirty = '<a href="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">危险数据</a>';
    const clean = sanitizeHtml(dirty);
    expect(clean).not.toContain('data:text/html');
  });

  it('阻断 data:image/svg+xml 危险伪协议，防止通过内联 SVG 注入脚本', () => {
    const dirty = '<a href="data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' onload=\'alert(1)\'></svg>">危险SVG外链</a>';
    const clean = sanitizeHtml(dirty);
    expect(clean).not.toContain('data:image/svg+xml');
  });

  it('安全放行合法的 http/https 链接并自动补全 target="_blank" 与 rel="noopener noreferrer"', () => {
    const safe = '<a href="https://court.gov.cn/doc/123">法条指引</a>';
    const clean = sanitizeHtml(safe);
    expect(clean).toContain('href="https://court.gov.cn/doc/123"');
    expect(clean).toContain('target="_blank"');
    expect(clean).toContain('rel="noopener noreferrer"');
  });

  it('边界输入容错：空字符串、纯文本与异常输入', () => {
    expect(sanitizeHtml('')).toBe('');
    expect(sanitizeHtml('   ')).toBe('');
    // @ts-expect-error 测试防御非字符串输入
    expect(sanitizeHtml(null)).toBe('');
    // @ts-expect-error 测试防御非字符串输入
    expect(sanitizeHtml(undefined)).toBe('');
    expect(sanitizeHtml('纯文本内容')).toBe('纯文本内容');
  });

  it('非白名单父标签 unwrap 时，内部危险标签同样被彻底剥离', () => {
    const dirty = '<svg><script>alert(1)</script></svg><math><iframe src="https://attacker.example.com"></iframe></math>';
    const clean = sanitizeHtml(dirty);
    expect(clean).not.toContain('<script');
    expect(clean).not.toContain('alert(1)');
    expect(clean).not.toContain('<iframe');
    expect(clean).not.toContain('attacker.example.com');
  });

  it('嵌套非白名单标签 unwrap 后，事件属性仍被剥离且安全标签得以保留', () => {
    const dirty = '<custom><span><img src="https://example.com/a.png" onerror="alert(1)"></span></custom>';
    const clean = sanitizeHtml(dirty);
    expect(clean).not.toContain('onerror');
    expect(clean).not.toContain('<custom');
    expect(clean).toContain('<img');
    expect(clean).toContain('https://example.com/a.png');
  });

  it('安全加固：剥离 style 与 id 全局属性，保留合法 class 等安全排版属性', () => {
    const dirty = '<p id="malicious-anchor" style="position:fixed;top:0;color:red" class="doc-paragraph">正文内容</p>';
    const clean = sanitizeHtml(dirty);
    expect(clean).toContain('class="doc-paragraph"');
    expect(clean).toContain('正文内容');
    expect(clean).not.toContain('id=');
    expect(clean).not.toContain('style=');
  });

  it('放行受控排版安全样式（如 text-align: center/right），并剔除其余混入的非法样式', () => {
    const dirty = '<p style="position:fixed; text-align: center; color: red">居中标题</p><div style="text-align: right">具状人落款</div>';
    const clean = sanitizeHtml(dirty);
    expect(clean).toContain('style="text-align: center"');
    expect(clean).toContain('style="text-align: right"');
    expect(clean).not.toContain('position');
    expect(clean).not.toContain('color');
  });

  it('无 DOMParser 极简环境安全退化：剥离 HTML 标签并转义为纯文本', () => {
    const originalDOMParser = globalThis.DOMParser;
    try {
      // @ts-expect-error 模拟无 DOMParser 的纯 Node/SSR 环境
      delete globalThis.DOMParser;
      const dirty = '<p>安全正文</p><script>alert("hack")</script><img onerror="leak()">&lt;script&gt;';
      const clean = sanitizeHtml(dirty);
      expect(clean).not.toContain('<p>');
      expect(clean).not.toContain('<script>');
      expect(clean).toContain('安全正文');
    } finally {
      globalThis.DOMParser = originalDOMParser;
    }
  });
});
