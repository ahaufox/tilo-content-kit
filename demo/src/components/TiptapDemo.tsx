/**
 * TiptapDemo — /tiptap 入口演示：ResizableTable 可持久化列宽编辑器
 *
 * 组装方式与 SDK 自身测试（tests/resizable-table.spec.ts）一致：
 * StarterKit + ResizableTable + TableRow + ResizableTableHeader + ResizableTableCell。
 * 用户拖动列边界后，列宽写入文档模型的 colwidth 属性，可在下方文档 HTML 的
 * <colgroup>/<col> 中实时验证 —— 同一份数据供刷新保持、Yjs 协同同步与 Word 导出。
 */
import { useEffect, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  ResizableTable,
  ResizableTableCell,
  ResizableTableHeader,
} from '@tilo-ui/content-kit/tiptap';
import { TableRow } from '@tiptap/extension-table-row';
import DemoCard from './DemoCard';
import { Accordion } from './Accordion';
import { CodeSample } from './CodeSample';
import { SNIPPETS } from '../data/snippets';

const INITIAL_HTML = `<p>证据清单（拖动列边界调整宽度，或使用按钮操作表格）：</p><table><thead><tr><th>序号</th><th>证据名称</th><th>证明内容</th></tr></thead><tbody><tr><td>1</td><td>《产品购销合同》</td><td>双方买卖合同关系成立</td></tr><tr><td>2</td><td>增值税专用发票</td><td>原告已履行开票义务</td></tr></tbody></table><p>列宽调整使用事务来源 <code>user-table-resize</code>（USER_TABLE_RESIZE_ORIGIN），与 /collab 的人机撤销隔离共用同一份常量。</p>`;

export function TiptapDemo() {
  const [html, setHtml] = useState(INITIAL_HTML);

  const editor = useEditor({
    extensions: [
      StarterKit,
      ResizableTable.configure({
        resizable: true,
        handleWidth: 6,
        cellMinWidth: 80,
        lastColumnResizable: true,
      }),
      TableRow,
      ResizableTableHeader,
      ResizableTableCell,
    ],
    content: INITIAL_HTML,
  });

  // 文档 HTML 实时导出：update 事件驱动，拖动列边界后即可看到 colgroup 变化
  useEffect(() => {
    if (!editor) return;
    const sync = () => setHtml(editor.getHTML());
    editor.on('update', sync);
    sync();
    return () => {
      editor.off('update', sync);
    };
  }, [editor]);

  const insertTable = () => {
    editor
      ?.chain()
      .focus()
      .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
      .run();
  };

  const resetDoc = () => {
    editor?.commands.setContent(INITIAL_HTML);
  };

  return (
    <DemoCard
      id="tiptap"
      entry="/tiptap"
      title="表格编辑器扩展"
      description={
        <>
          ResizableTable 扩展 @tiptap/extension-table：把用户拖拽后的列宽持久化为
          文档模型 colwidth 属性，DOM 的 &lt;colgroup&gt;/&lt;col&gt; 与模型双向映射。
          仅上收业务无关的扩展实现，UI 组件（工具栏 / BubbleMenu）留在宿主。
        </>
      }
    >
      <div className="demo-controls demo-actions">
        <button className="btn" onClick={insertTable}>
          插入表格
        </button>
        <button className="btn ghost" onClick={resetDoc}>
          重置文档
        </button>
      </div>

      <div className="tiptap-box">
        <EditorContent editor={editor} />
      </div>

      <details className="html-dump">
        <summary>查看文档 HTML（colgroup / col 列宽持久化证据，随编辑实时刷新）</summary>
        <pre className="code-out">{html}</pre>
      </details>

      <p className="demo-note">
        组表要点：ResizableTable 需与 TableRow / ResizableTableHeader / ResizableTableCell
        一同装配（Tiptap v3 的 table 扩展不自动内置行与单元格）。
      </p>

      <div className="demo-code-ref">
        <Accordion
          id="ref-tiptap"
          title="代码参考"
          summary="ResizableTable 扩展的最小装配。"
        >
          <CodeSample label="/tiptap" code={SNIPPETS.editor} />
        </Accordion>
      </div>
    </DemoCard>
  );
}

export default TiptapDemo;
