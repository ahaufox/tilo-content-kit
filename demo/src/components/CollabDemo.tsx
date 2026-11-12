/**
 * CollabDemo — /collab 入口演示：单页双编辑器共用一个 Y.Doc + 人机撤销隔离
 *
 * 数据流：一个内存 Y.Doc（无 WebsocketProvider，y-websocket 仅类型依赖）；
 * 两个 Tiptap 编辑器经 Collaboration 扩展绑定同一 XmlFragment('content')，
 * 内容实时互相同步。patchYjsOriginSync 透传 ProseMirror 事务 origin：
 *   - 本地输入 → ySyncPluginKey → localUndoManager 追踪；
 *   - 「AI 写入」事务携带 origin meta = AGENT_ORIGIN → agentUndoManager 追踪。
 * 两套撤销栈互不污染：撤销 AI 编辑不会回退人类输入，反之亦然。
 */
import { useEffect, useMemo } from 'react';
import * as Y from 'yjs';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import {
  AGENT_ORIGIN,
  createIsolatedUndoManagers,
  destroyIsolatedUndoManagers,
  patchYjsOriginSync,
  useIsolatedUndoManagers,
  useUndoManagerStatus,
} from '@tilo-ui/content-kit/collab';
import DemoCard from './DemoCard';
import { Accordion } from './Accordion';
import { CodeSample } from './CodeSample';
import { SNIPPETS } from '../data/snippets';

const AI_SENTENCE =
  'AI 补充：经核对账簿，被告尚欠货款 128,600 元，建议在诉请中一并主张逾期利息。';

/** 在 Yjs 层构造段落（XmlElement 名 = PM 节点类型名，与 SDK 测试同构） */
function yParagraph(text: string): Y.XmlElement {
  const el = new Y.XmlElement('paragraph');
  const t = new Y.XmlText();
  t.insert(0, text);
  el.insert(0, [t]);
  return el;
}

export function CollabDemo() {
  // 单例 Y.Doc：创建时种入初始内容 + 末尾哨兵空段落（在编辑器创建前完成，
  // fragment 内容即编辑器初稿）。哨兵段落非 AI 事务创建，撤销 AI 不会级联删除它；
  // 文档尾部因此永远是本地输入区。
  const ydoc = useMemo(() => {
    const doc = new Y.Doc();
    const fragment = doc.getXmlFragment('content');
    doc.transact(() => {
      fragment.insert(0, [
        yParagraph('左侧为本地编辑通道：直接在此输入文字。'),
        yParagraph('右侧为 AI 编辑通道：点击「AI 写入一段」观察撤销隔离。'),
        yParagraph(''),
      ]);
    });
    return doc;
  }, []);

  const editorLocal = useEditor({
    extensions: [
      // 协同扩展自带历史管理，必须关闭 StarterKit 的 undoRedo
      StarterKit.configure({ undoRedo: false }),
      Collaboration.configure({ document: ydoc, field: 'content' }),
    ],
  });

  const editorAgent = useEditor({
    extensions: [
      StarterKit.configure({ undoRedo: false }),
      Collaboration.configure({ document: ydoc, field: 'content' }),
    ],
  });

  // 挂载 origin 透传：人类编辑走 ySyncPluginKey，AI 事务携带 AGENT_ORIGIN
  useEffect(() => {
    if (editorLocal) patchYjsOriginSync(editorLocal, ydoc);
    if (editorAgent) patchYjsOriginSync(editorAgent, ydoc);
  }, [editorLocal, editorAgent, ydoc]);

  const managers = useIsolatedUndoManagers({ ydoc });
  const status = useUndoManagerStatus(managers);

  // 卸载时释放撤销管理器观察器，防内存泄漏
  useEffect(() => () => destroyIsolatedUndoManagers(managers), [managers]);

  /** AI 写入路径（生产语义）：单个 PM 事务同时携带 origin meta 与内容插入。
   *  插入位置固定在末尾哨兵段落之前，保证文档尾部始终是本地输入区：
   *  若 AI 段落成为末段，尾部打字会落入 AI 宿主内部，撤销 AI 时会被
   *  Yjs 宿主删除语义级联带走。 */
  const aiWrite = () => {
    editorAgent
      ?.chain()
      .command(({ tr, state, dispatch }) => {
        if (dispatch) {
          tr.setMeta('origin', AGENT_ORIGIN);
          const paragraph = state.schema.nodes.paragraph.create(
            null,
            state.schema.text(AI_SENTENCE),
          );
          const end = state.doc.content.size;
          const last = state.doc.lastChild;
          tr.insert(last ? end - last.nodeSize : end, paragraph);
        }
        return true;
      })
      .run();
  };

  return (
    <DemoCard
      id="collab"
      entry="/collab"
      title="协同编辑基座"
      description={
        <>
          Yjs 富文本协同的最小可用底座：本页两个编辑器共享同一 Y.Doc（内存模式，
          生产经 WebsocketProvider 同步远端）。patchYjsOriginSync 让「人改」与
          「AI 改」进入不同撤销栈 —— createIsolatedUndoManagers 是撤销隔离的唯一入口。
        </>
      }
    >
      <div className="demo-controls demo-actions">
        <button className="btn primary" onClick={aiWrite}>
          AI 写入一段
        </button>
        <button className="btn" onClick={() => managers.localUndoManager.undo()} disabled={!status.canUndo}>
          撤销本地编辑
        </button>
        <button className="btn" onClick={() => managers.localUndoManager.redo()} disabled={!status.canRedo}>
          重做本地编辑
        </button>
        <button className="btn" onClick={() => managers.agentUndoManager.undo()} disabled={!status.canUndoAgent}>
          撤销 AI 编辑
        </button>
      </div>

      <div className="chips">
        <span className={`chip${status.canUndo ? ' ok' : ''}`}>本地可撤销: <b>{String(status.canUndo)}</b></span>
        <span className={`chip${status.canRedo ? ' ok' : ''}`}>本地可重做: <b>{String(status.canRedo)}</b></span>
        <span className={`chip${status.canUndoAgent ? ' ok' : ''}`}>AI 可撤销: <b>{String(status.canUndoAgent)}</b></span>
      </div>

      <div className="collab-grid">
        <div className="collab-pane">
          <span className="pane-label">本地编辑（律师）— 输入即同步到右侧</span>
          <EditorContent editor={editorLocal} />
        </div>
        <div className="collab-pane ai">
          <span className="pane-label">AI 编辑器 — 内容写入使用 AGENT_ORIGIN</span>
          <EditorContent editor={editorAgent} />
        </div>
      </div>

      <p className="demo-note">
        验证方法：在左栏末尾空行输入文字 → 点「撤销 AI 编辑」不影响你的输入；
        点「AI 写入一段」（AI 段落插在末尾空行之前）→ 再输入后点「撤销本地编辑」，不回退 AI 段落。
        边界提示：撤销 AI 会整段移除 AI 写入的段落（Yjs 宿主删除语义），请勿把光标点进 AI 段落内部输入，
        否则该段被撤销时其中的输入会一并删除；末尾空行是固定的本地输入区。
        y-websocket 在 SDK 内仅为类型依赖，本页无需任何服务端。
      </p>

      <div className="demo-code-ref">
        <Accordion
          id="ref-collab"
          title="代码参考"
          summary="computeMembers / tiloAwarenessAdapter 的成员与状态计算。"
        >
          <CodeSample label="/collab" code={SNIPPETS.collab} />
        </Accordion>
      </div>
    </DemoCard>
  );
}

export default CollabDemo;
