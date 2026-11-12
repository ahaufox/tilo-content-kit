/**
 * 各能力入口的最小参考代码片段（对齐 demo 的 data/snippets）
 *
 * 与 docs 站各 Demo 一一对应，挂在每张演示卡底部的「代码参考」折叠区，
 * 供「核对某一项能力时，打开即看、下方即是参考代码」。
 * 注意：模板字符串内容紧跟反引号、且结尾紧贴闭合反引号，避免首尾出现空行。
 */
export const SNIPPETS = {
  start: `import { useState, useEffect } from 'react';
import { StreamingMarkdown } from '@tilo-ui/content-kit/markdown';
import '@tilo-ui/content-kit/styles.css';

function AgentReply({ body }: { body: ReadableStream<Uint8Array> }) {
  const [text, setText] = useState('');
  useEffect(() => {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let acc = '';
    (async () => {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setText(acc);
      }
    })();
    return () => reader.cancel();
  }, [body]);
  return <StreamingMarkdown content={text} isStreaming />;
}`,

  stream: `import { StreamingMarkdown } from '@tilo-ui/content-kit/markdown';

<StreamingMarkdown content={accumulated} isStreaming={busy} />`,
  markdown: `import { MarkdownContent } from '@tilo-ui/content-kit/markdown';
import '@tilo-ui/content-kit/styles.css';

<MarkdownContent content={source} />`,
  convert: `import { ensureHtml, htmlToMarkdown } from '@tilo-ui/content-kit/convert';

const html = ensureHtml(markdown);
const md = htmlToMarkdown(html);`,
  content: `import {
  sanitizeHtml,
  isMarkdown,
  isHtml,
  calculateTableColumnWidths,
  injectTableWidthsToHtml,
} from '@tilo-ui/content-kit/content';

const clean = sanitizeHtml(dirty);          // 白名单剥离 script / iframe / 事件属性
const widths = calculateTableColumnWidths(rows);
const html = injectTableWidthsToHtml(tableHtml);`,
  legal: `import {
  normalizeLegalMarkdown,
  stripLeadingDocumentTitle,
  boldLegalSectionHeadings,
} from '@tilo-ui/content-kit/legal';

const next = normalizeLegalMarkdown(source);`,
  theme: `import { applyProfile, profileFromDocumentTemplate } from '@tilo-ui/content-kit/theme';

const profile = profileFromDocumentTemplate(settings);
const { style, applied, rejected } = applyProfile(profile);`,
  editor: `import { ResizableTable, ResizableTableCell, ResizableTableHeader } from '@tilo-ui/content-kit/tiptap';

ResizableTable.configure({ resizable: true, cellMinWidth: 80 })`,
  collab: `import { computeMembers, tiloAwarenessAdapter } from '@tilo-ui/content-kit/collab';

// 连接与鉴权由宿主注入；本演示使用内存 Mock provider。
const view = computeMembers(provider, tiloAwarenessAdapter);`,
} as const;
