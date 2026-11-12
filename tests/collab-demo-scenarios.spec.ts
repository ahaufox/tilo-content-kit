/**
 * collab-demo-scenarios — CollabDemo 组装场景回归测试
 *
 * 复刻 docs CollabDemo 的真实组装链路（双编辑器 + Collaboration v3.33 +
 * patchYjsOriginSync + createIsolatedUndoManagers），锁定两条结论：
 *
 * 1. 核心隔离成立：撤销 AI 段落不回退独立宿主中的本地输入；撤销本地不删 AI。
 * 2. 边界语义（Yjs 宿主删除）：本地输入若落入 AI 创建的段落（XmlElement 宿主）
 *    内部，agentUm.undo() 删除宿主时会级联带走其中的本地输入——这是 Yjs
 *    宿主删除语义，并非 origin 污染。Demo 以「哨兵空段落 + AI 写入插在
 *    哨兵之前」规避此边界，场景 E 锁定该组装。
 *
 * 位置语义说明：Tiptap insertContentAt 的入参是 ProseMirror 文档位置，
 * 不是 Yjs fragment 元素索引。文档末段文本尾部的打字位置 = doc.content.size - 1。
 */
import { describe, it, expect, afterEach } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import * as Y from 'yjs';
import {
  AGENT_ORIGIN,
  createIsolatedUndoManagers,
  destroyIsolatedUndoManagers,
  patchYjsOriginSync,
} from '../src/collab';

function yParagraph(text: string): Y.XmlElement {
  const el = new Y.XmlElement('paragraph');
  const t = new Y.XmlText();
  t.insert(0, text);
  el.insert(0, [t]);
  return el;
}

/** 拼接 fragment 内所有段落的文本（仅 paragraph，不含结构信息） */
function textOf(doc: Y.Doc): string {
  const fragment = doc.getXmlFragment('content');
  let out = '';
  for (let i = 0; i < fragment.length; i++) {
    const el = fragment.get(i) as Y.XmlElement;
    if (el.nodeName === 'paragraph') out += (el.firstChild as Y.XmlText).toString();
  }
  return out;
}

/** AI 写入（Demo 原路径）：新段落插在文档最末（成为末段宿主） */
function aiWriteAtVeryEnd(editor: Editor): void {
  editor
    .chain()
    .command(({ tr, state, dispatch }) => {
      if (dispatch) {
        tr.setMeta('origin', AGENT_ORIGIN);
        const p = state.schema.nodes.paragraph.create(null, state.schema.text('AI 补充'));
        tr.insert(state.doc.content.size, p);
      }
      return true;
    })
    .run();
}

/** AI 写入（Demo 修复后路径）：新段落插在末尾哨兵段落之前 */
function aiWriteBeforeSentinel(editor: Editor): void {
  editor
    .chain()
    .command(({ tr, state, dispatch }) => {
      if (dispatch) {
        tr.setMeta('origin', AGENT_ORIGIN);
        const p = state.schema.nodes.paragraph.create(null, state.schema.text('AI 补充'));
        const end = state.doc.content.size;
        const last = state.doc.lastChild;
        tr.insert(last ? end - last.nodeSize : end, p);
      }
      return true;
    })
    .run();
}

/** 模拟「光标在文档末段文本尾部打字」（PM 位置 = doc.content.size - 1） */
function typeAtTail(editor: Editor, text: string): void {
  editor.commands.insertContentAt(editor.state.doc.content.size - 1, text);
}

describe('CollabDemo 组装场景：撤销隔离与宿主删除边界', () => {
  let ydoc: Y.Doc;
  let editorLocal: Editor | null = null;
  let editorAgent: Editor | null = null;
  let managers: ReturnType<typeof createIsolatedUndoManagers> | null = null;

  /** 复刻 Demo 组装：种入种子段落（可选哨兵空段落）→ 双编辑器 → patch → 管理器 */
  function setup(opts: { sentinel?: boolean } = {}): { editorLocal: Editor; editorAgent: Editor } {
    ydoc = new Y.Doc();
    const fragment = ydoc.getXmlFragment('content');
    const seed = [yParagraph('种子一'), yParagraph('种子二')];
    if (opts.sentinel) seed.push(yParagraph(''));
    ydoc.transact(() => {
      fragment.insert(0, seed);
    });
    const mk = () =>
      new Editor({
        extensions: [
          StarterKit.configure({ undoRedo: false }),
          Collaboration.configure({ document: ydoc, field: 'content' }),
        ],
      });
    editorLocal = mk();
    editorAgent = mk();
    patchYjsOriginSync(editorLocal, ydoc);
    patchYjsOriginSync(editorAgent, ydoc);
    managers = createIsolatedUndoManagers(ydoc);
    return { editorLocal, editorAgent };
  }

  afterEach(() => {
    if (managers) destroyIsolatedUndoManagers(managers);
    editorLocal?.destroy();
    editorAgent?.destroy();
  });

  it('核心隔离：撤销 AI 段落不回退种子段落内的本地输入', () => {
    const { editorLocal } = setup();
    // 本地输入落在「种子二」文本尾部（种子段落宿主非 AI 创建）
    typeAtTail(editorLocal, 'X1');
    expect(textOf(ydoc)).toContain('种子二X1');

    aiWriteAtVeryEnd(editorAgent!);
    expect(textOf(ydoc)).toContain('AI 补充');

    managers!.agentUndoManager.undo();
    expect(textOf(ydoc)).not.toContain('AI 补充');
    expect(textOf(ydoc)).toContain('X1');
  });

  it('核心隔离：撤销本地只删本地文本，AI 段落保留', () => {
    const { editorLocal } = setup();
    aiWriteAtVeryEnd(editorAgent!);
    // 光标在文档尾部 = AI 段落文本尾部，本地文本级插入仍只删插入区间
    typeAtTail(editorLocal, 'X1');
    expect(textOf(ydoc)).toContain('AI 补充X1');

    managers!.localUndoManager.undo();
    expect(textOf(ydoc)).not.toContain('X1');
    expect(textOf(ydoc)).toContain('AI 补充');
  });

  it('origin 归属实证：本地输入入 localUm 栈，AI 写入入 agentUm 栈', () => {
    const { editorLocal } = setup();
    typeAtTail(editorLocal, 'X1');
    expect(managers!.localUndoManager.undoStack.length).toBeGreaterThan(0);
    expect(managers!.agentUndoManager.undoStack.length).toBe(0);

    aiWriteAtVeryEnd(editorAgent!);
    expect(managers!.agentUndoManager.undoStack.length).toBe(1);
  });

  it('边界实证（Yjs 宿主删除语义）：本地输入落入 AI 段落内部，撤销 AI 时级联删除', () => {
    const { editorLocal } = setup();
    aiWriteAtVeryEnd(editorAgent!);
    // 文档尾部即 AI 段落文本尾部：此时打字落入 AI 宿主内部
    typeAtTail(editorLocal, 'X1');
    expect(textOf(ydoc)).toContain('AI 补充X1');

    managers!.agentUndoManager.undo();
    // 宿主 XmlElement 被整体删除，其中的本地输入随之消失（如实记录的边界）
    expect(textOf(ydoc)).not.toContain('AI 补充');
    expect(textOf(ydoc)).not.toContain('X1');
  });

  it('修复后 Demo 组装：哨兵空段落 + AI 写入插在哨兵前，两种撤销互不伤害', () => {
    const { editorLocal } = setup({ sentinel: true });
    aiWriteBeforeSentinel(editorAgent!);

    // 本地输入落在末尾哨兵段落（空段落文本尾部 = 哨兵内部）
    typeAtTail(editorLocal, 'X1');
    expect(textOf(ydoc)).toContain('AI 补充');
    expect(textOf(ydoc)).toContain('X1');

    // 撤销 AI：AI 段落移除，哨兵宿主存活，本地输入保留
    managers!.agentUndoManager.undo();
    expect(textOf(ydoc)).not.toContain('AI 补充');
    expect(textOf(ydoc)).toContain('X1');
    expect(ydoc.getXmlFragment('content').length).toBe(3);

    // 再写入 AI → 撤销本地：本地文本移除，AI 段落保留
    aiWriteBeforeSentinel(editorAgent!);
    managers!.localUndoManager.undo();
    expect(textOf(ydoc)).not.toContain('X1');
    expect(textOf(ydoc)).toContain('AI 补充');
  });
});
