/**
 * legal/align-containers — 公文对齐容器（<div align> / <p align>）双向空行隔离归一化
 *
 * 背景（CNB Issue #585 / 专案 525）：后端标准化输出的居中/右对齐排版容器，
 * 若与相邻段落或有序列表紧密贴合，会被 CommonMark 解析为 HTML Block，
 * 导致紧随其后的诉讼请求条目整体丢失。
 *
 * 归一化契约：
 *  1. 起始标签前与闭合标签后强制注入独立空行（\n\n），阻断 HTML Block 对相邻列表/段落的吞噬；
 *  2. 容器内部以 \n\n 隔离，使内部 Markdown 被独立解析（与 htmlToMarkdown 产出的规范形态保持一致）；
 *  3. 表格单元格（<td>/<th>）内部严禁破坏性断行，命中即原样保留；
 *  4. 嵌套容器按最外层优先、内层递归处理，重复执行结果恒等（幂等）。
 */

/** 对齐容器起始标签：<div align="..."> / <p align="..."> / style 含 text-align 的块级容器 */
const ALIGN_CONTAINER_OPEN_RE =
  /<(div|p)\b[^>]*(?:\balign\s*=|style\s*=\s*['"][^'"]*text-align)[^>]*>/i;

/** 表格单元格标签（开闭），用于判定对齐容器是否落在单元格内部 */
const TABLE_CELL_TAG_RE = /<(\/?)(td|th)\b[^>]*>/gi;

/**
 * 统计片段内表格单元格标签的净深度变化（开标签 +1，闭标签 -1）
 */
const countCellTagDelta = (fragment: string): number => {
  if (!fragment) return 0;
  TABLE_CELL_TAG_RE.lastIndex = 0;
  let delta = 0;
  let match: RegExpExecArray | null;
  while ((match = TABLE_CELL_TAG_RE.exec(fragment)) !== null) {
    delta += match[1] ? -1 : 1;
  }
  return delta;
};

/**
 * 查找与起始标签配对的闭合标签位置（支持同标签嵌套计数）
 */
const findContainerClose = (
  text: string,
  tag: string,
  from: number,
): { start: number; end: number } | null => {
  const openRe = new RegExp(`<${tag}\\b[^>]*>`, 'gi');
  const closeRe = new RegExp(`</${tag}\\s*>`, 'gi');
  let depth = 1;
  let cursor = from;
  while (cursor < text.length) {
    openRe.lastIndex = cursor;
    closeRe.lastIndex = cursor;
    const nextOpen = openRe.exec(text);
    const nextClose = closeRe.exec(text);
    if (!nextClose) return null;
    if (nextOpen && nextOpen.index < nextClose.index) {
      depth += 1;
      cursor = nextOpen.index + nextOpen[0].length;
      continue;
    }
    depth -= 1;
    if (depth === 0) {
      return { start: nextClose.index, end: nextClose.index + nextClose[0].length };
    }
    cursor = nextClose.index + nextClose[0].length;
  }
  return null;
};

/**
 * 对齐容器双向空行隔离归一化（纯函数）
 *
 * @param text 原始文本
 * @returns 归一化文本；表格单元格内部与无配对闭合标签的残缺容器原样保留
 */
export const normalizeAlignContainers = (text: string): string => {
  if (!text) return '';

  const parts: string[] = [];
  let cursor = 0;
  let cellDepth = 0;
  let emitted = false;
  /** 上一个输出为容器闭合标签，后续内容前需补独立空行 */
  let pendingGap = false;

  for (;;) {
    const openRe = new RegExp(ALIGN_CONTAINER_OPEN_RE.source, 'gi');
    openRe.lastIndex = cursor;
    const match = openRe.exec(text);
    if (!match) break;

    const tag = match[1].toLowerCase();
    const openStart = match.index;
    const openEnd = openStart + match[0].length;
    const between = text.slice(cursor, openStart);
    cellDepth += countCellTagDelta(between);

    const close = findContainerClose(text, tag, openEnd);
    if (!close) {
      // 无配对闭合标签：原样保留该残缺容器，避免误伤 HTML 片段
      parts.push(between, text.slice(openStart, openEnd));
      cursor = openEnd;
      pendingGap = false;
      emitted = true;
      continue;
    }

    if (cellDepth > 0) {
      // 表格单元格内部：原样保留，严禁破坏性断行
      parts.push(between, text.slice(openStart, close.end));
      cursor = close.end;
      pendingGap = false;
      emitted = true;
      continue;
    }

    // 容器前的普通内容：尾部空白收敛为空行保底，闭合标签后的前导空白统一为 \n\n
    const contentChunk = between.replace(/\s+$/, '');
    if (contentChunk) {
      const body = pendingGap ? contentChunk.replace(/^\s+/, '') : contentChunk;
      parts.push(pendingGap ? `\n\n${body}` : body);
      emitted = true;
    }
    // 起始标签前空行保底（文首无需补）
    if (emitted) parts.push('\n\n');

    const innerRaw = text.slice(openEnd, close.start).trim();
    const inner = innerRaw ? normalizeAlignContainers(innerRaw) : '';
    parts.push(`${match[0]}\n\n${inner}\n\n${text.slice(close.start, close.end)}`);

    cursor = close.end;
    pendingGap = true;
    emitted = true;
  }

  const tail = text.slice(cursor);
  const tailContent = tail.replace(/\s+$/, '');
  if (tailContent) {
    const body = pendingGap ? tailContent.replace(/^\s+/, '') : tailContent;
    parts.push(pendingGap ? `\n\n${body}` : body);
  }

  return parts.join('');
};
