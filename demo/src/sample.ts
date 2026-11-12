/**
 * sample — 流式演示的 token 分片工具
 *
 * 推流正文本身来自 data/scenarios（四个场景各一份样例文档），本文件只负责
 * 把它切成近似 LLM token 流的片段，还原打字机节奏。
 * 纯演示用样例文案，非真实案件 / 工单数据。
 */

/** 模拟 LLM token 流的分块：按 2~8 字符随机切片，保证节奏抖动且可复现 */
export function tokenizeForDemo(text: string): string[] {
  const chunks: string[] = [];
  let cursor = 0;
  while (cursor < text.length) {
    // 简单伪随机：基于游标的抖动，保证每次播放节奏略有差异且可复现
    const jitter = (cursor * 7 + text.charCodeAt(cursor % text.length)) % 7;
    const size = 2 + jitter;
    chunks.push(text.slice(cursor, cursor + size));
    cursor += size;
  }
  return chunks;
}
