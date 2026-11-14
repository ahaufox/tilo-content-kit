/**
 * sanitizeHtml.ts — 中国法律公文与通用富文本 HTML 安全白名单清洗器
 *
 * 规范与约束：
 *   - 严格遵循白名单机制：仅允许公文与 Markdown 常用排版标签与安全属性；
 *   - 阻断与剥离所有脚本标签（<script>, <style>, <iframe>, <object>, <embed>）；
 *   - 彻底剥离所有内联 on* 事件监听器（如 onerror, onload, onclick）；
 *   - 防御协议注入与 HTML 实体混淆（如 javascript:, vbscript:, data:text/html）；
 *   - 纯函数实现，在 DOMParser (浏览器/JSDOM) 环境优先使用标准 DOM 树遍历，杜绝正则绕过。
 */

const ALLOWED_TAGS = new Set([
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'blockquote', 'strong', 'b', 'em', 'i', 'u', 's', 'del', 'strike',
  'table', 'thead', 'tbody', 'tr', 'th', 'td', 'colgroup', 'col',
  'ul', 'ol', 'li', 'hr', 'br', 'span', 'code', 'pre', 'sub', 'sup',
  'a', 'img', 'div',
]);

const FORBIDDEN_TAGS = new Set([
  'script', 'style', 'iframe', 'object', 'embed', 'noscript',
  'meta', 'link', 'base', 'applet', 'form', 'input', 'button', 'textarea',
]);

const GLOBAL_ALLOWED_ATTRS = new Set([
  'class', 'title', 'dir', 'lang', 'align', 'style', 'colwidth',
]);

/**
 * 校验并清洗内联 style 属性：仅保留排版安全的 CSS 规则（text-align、px 列宽与文字颜色），
 * 坚决剔除任何可疑函数、外部引用与定位注入。
 */
function sanitizeStyle(styleValue: string): string {
  if (!styleValue) return '';
  // 阻断可疑表达式与危险函数
  if (/url\(|expression\(|javascript:|behavior|-moz-binding/i.test(styleValue)) {
    return '';
  }
  const rules = styleValue.split(';');
  const safeRules: string[] = [];
  for (const rule of rules) {
    const trimmed = rule.trim();
    if (!trimmed) continue;
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) continue;
    const prop = trimmed.slice(0, colonIdx).trim().toLowerCase();
    const val = trimmed.slice(colonIdx + 1).trim().toLowerCase();
    if (prop === 'text-align' && ['left', 'right', 'center', 'justify'].includes(val)) {
      safeRules.push(`text-align: ${val}`);
    }
    if (prop === 'width' && /^\d+(\.\d+)?px$/.test(val)) {
      safeRules.push(`width: ${val}`);
    }
    // 文字颜色（核对提醒红色高亮等）：仅放行 hex / 命名色 / rgb(a) 数值色，杜绝函数式注入
    if (
      prop === 'color' &&
      /^(#[0-9a-f]{3,8}|[a-z]+|rgba?\(\s*[\d.]+(\s*,\s*[\d.]+){0,3}\s*\))$/i.test(val)
    ) {
      safeRules.push(`color: ${val}`);
    }
  }
  return safeRules.join('; ');
}

const TAG_ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(['href', 'target', 'rel', 'title']),
  img: new Set(['src', 'alt', 'title', 'width', 'height', 'loading']),
  table: new Set(['width', 'border', 'cellpadding', 'cellspacing', 'align', 'colwidth']),
  colgroup: new Set(['span', 'width', 'align', 'valign']),
  col: new Set(['span', 'width', 'colwidth', 'align', 'valign']),
  th: new Set(['colspan', 'rowspan', 'align', 'valign', 'width', 'colwidth']),
  td: new Set(['colspan', 'rowspan', 'align', 'valign', 'width', 'colwidth']),
};

/**
 * 校验 URL 属性是否安全（抵御 javascript:、实体混淆与危险伪协议）
 */
function isSafeUrl(url: string): boolean {
  if (!url) return false;
  // 规范化：去除不可见控制字符、全角/半角空格
  let normalized = url.replace(/[\u0000-\u001f\u007f-\u009f\s]+/g, '').toLowerCase();

  // 若包含 HTML 实体编码混淆（如 &#x61; 或 &#106;），简易还原解码后再检测
  if (/&#(?:x[0-9a-f]+|[0-9]+);?/i.test(normalized)) {
    try {
      normalized = normalized
        .replace(/&#x([0-9a-f]+);?/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
        .replace(/&#([0-9]+);?/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
        .replace(/[\u0000-\u001f\u007f-\u009f\s]+/g, '')
        .toLowerCase();
    } catch {
      return false;
    }
  }

  // 阻断危险伪协议
  if (
    normalized.startsWith('javascript:') ||
    normalized.startsWith('vbscript:') ||
    normalized.startsWith('data:text/html') ||
    normalized.startsWith('data:application/') ||
    normalized.startsWith('data:image/svg+xml')
  ) {
    return false;
  }

  return true;
}

/**
 * 递归清洗 DOM 节点
 */
function cleanNode(node: Node): void {
  // 文本节点直接放行
  if (node.nodeType === Node.TEXT_NODE) return;

  // 仅处理元素节点
  if (node.nodeType === Node.ELEMENT_NODE) {
    const el = node as HTMLElement;
    const tagName = el.tagName.toLowerCase();

    // 1. 绝对黑名单：连同子节点彻底移除
    if (FORBIDDEN_TAGS.has(tagName)) {
      el.remove();
      return;
    }

    // 2. 自底向上先清洗全部子节点：保证 unwrap 提升出来的节点已完成清洗。
    //    若在非白名单分支直接 return，<svg><script>…</script></svg> 等嵌套危险节点
    //    会被提升到父节点却从未进入清洗队列，形成白名单逃逸。
    const children = Array.from(el.childNodes);
    for (const child of children) cleanNode(child);

    // 3. 非白名单标签：提升已清洗的子节点（unwrap）并移除自身
    if (!ALLOWED_TAGS.has(tagName)) {
      const parent = el.parentNode;
      if (parent) {
        while (el.firstChild) {
          parent.insertBefore(el.firstChild, el);
        }
        el.remove();
      } else {
        el.remove();
      }
      return;
    }

    // 4. 标签在白名单内：清洗所有属性
    const allowedAttrs = TAG_ALLOWED_ATTRS[tagName];
    const attrs = Array.from(el.attributes);

    for (const attr of attrs) {
      const attrName = attr.name.toLowerCase();
      const attrValue = attr.value;

      // 彻底剥离所有以 on 开头的事件属性
      if (attrName.startsWith('on')) {
        el.removeAttribute(attr.name);
        continue;
      }

      // 检查是否属于允许的全局属性或标签特有属性
      const isAllowed =
        GLOBAL_ALLOWED_ATTRS.has(attrName) ||
        (allowedAttrs && allowedAttrs.has(attrName));

      if (!isAllowed) {
        el.removeAttribute(attr.name);
        continue;
      }

      // 针对 href 与 src 进行 URL 安全校验
      if (attrName === 'href' || attrName === 'src') {
        if (!isSafeUrl(attrValue)) {
          el.removeAttribute(attr.name);
          continue;
        }
      }

      // 针对 style 属性进行排版白名单清洗（仅允许安全的 text-align，抵御 CSS XSS）
      if (attrName === 'style') {
        const safeStyle = sanitizeStyle(attrValue);
        if (safeStyle) {
          el.setAttribute('style', safeStyle);
        } else {
          el.removeAttribute(attr.name);
        }
        continue;
      }

    }

    // 针对 a 标签强制补充 target="_blank" 与 rel="noopener noreferrer" 安全加固
    if (tagName === 'a') {
      el.setAttribute('target', '_blank');
      const currentRel = el.getAttribute('rel') || '';
      if (!currentRel.includes('noopener')) {
        el.setAttribute('rel', (currentRel ? `${currentRel} ` : '') + 'noopener noreferrer');
      }
    }
  }
}

/**
 * 针对无 DOMParser 环境（如 Node 离线测试或纯服务端）的极简纯文本安全转义
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * 对 HTML 片段进行白名单清洗
 *
 * @param dirtyHtml 未经清洗的 HTML 字符串
 * @returns 清洗后符合公文与排版白名单的安全 HTML 字符串
 */
export function sanitizeHtml(dirtyHtml: string): string {
  if (!dirtyHtml || typeof dirtyHtml !== 'string') return '';
  const trimmed = dirtyHtml.trim();
  if (!trimmed) return '';

  // 在现代浏览器与 JSDOM 环境优先使用 DOMParser
  if (typeof DOMParser !== 'undefined') {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(trimmed, 'text/html');
      const body = doc.body;

      const nodes = Array.from(body.childNodes);
      for (const node of nodes) {
        cleanNode(node);
      }

      return body.innerHTML.trim();
    } catch {
      // 解析器异常进入下方安全兜底
    }
  }

  // 服务端/纯 Node 无 DOMParser 环境安全退化：直接剥离标签并转义为纯文本，杜绝双套清洗强度不一致引发 XSS 逃逸
  return escapeHtml(trimmed.replace(/<[^>]*>/g, ''));
}
