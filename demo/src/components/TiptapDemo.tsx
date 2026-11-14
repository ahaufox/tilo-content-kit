/**
 * TiptapDemo — /editor 与 /tiptap 入口演示：开箱即用的 RichEditor 与 EditorToolbar
 *
 * 演示全套标准能力：
 *   1. 顶部标准 EditorToolbar（文本格式、文字颜色标红/换色、文本高亮、标题、对齐、列表、表格控制）；
 *   2. 超宽自适应与响应式：单行平滑横滑 vs 语义组自动折行 (multiline)；
 *   3. 业务插槽 extraToolbarActions 吸附常驻展示；
 *   4. ResizableTable 可持久化列宽表格拖拽；
 *   5. 行内文字颜色（<span style="color:red">核对提醒</span>）与 Markdown 双向保真存取；
 *   6. 零外部 UI/图标库依赖，完全消费随包 --tk-* 变量。
 */
import { useState } from 'react';
import { RichEditor } from '@tilo-ui/content-kit/editor';
import DemoCard from './DemoCard';
import { Accordion } from './Accordion';
import { CodeSample } from './CodeSample';
import { SNIPPETS } from '../data/snippets';

const INITIAL_MD = `### 周会待办与重要核对事项

借款事由：<span style="color:red">[事由：涉及第三季度清算款项，请核实修改]</span>，以上请于周五前完成。

| 事项 | 负责人 | 截止时间 |
| :--- | :--- | :--- |
| 结算模块灰度扩量到 20% | 李工 | 11-14 |
| 导出慢查询排查与优化 | 王小明 | 11-18 |

拖动列边界调整表格宽度，或使用工具栏设置文字颜色、高亮与居中排版。`;

export function TiptapDemo() {
  const [content, setContent] = useState(INITIAL_MD);
  const [multiline, setMultiline] = useState(false);
  const [boxWidth, setBoxWidth] = useState<'full' | 'narrow' | 'tablet'>('full');
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const resetDoc = () => {
    setContent(INITIAL_MD);
  };

  const handleSave = () => {
    setSaveStatus(new Date().toLocaleTimeString());
    setTimeout(() => setSaveStatus(null), 3000);
  };

  const widthStyle: React.CSSProperties = {
    maxWidth: boxWidth === 'narrow' ? '420px' : boxWidth === 'tablet' ? '640px' : '100%',
    transition: 'max-width 0.25s ease',
    margin: '0 auto',
  };

  return (
    <DemoCard
      id="tiptap"
      entry="/editor"
      title="富文本编辑器与格式工具栏"
      description={
        <>
          开箱即用的 <code>RichEditor</code> 与 <code>EditorToolbar</code>：内置排版、
          文字颜色（核对提醒标红）、文本高亮、对齐与 <code>ResizableTable</code> 表格列宽持久化。
          支持窄屏/超宽自适应（单行平滑横滑 vs 语义组自动折行 <code>multiline</code>），
          零外部图标与 UI 库绑定，纯原生内联 SVG，样式完全消费随包 <code>--tk-*</code> 变量。
        </>
      }
    >
      <div className="demo-controls demo-actions" style={{ flexWrap: 'wrap', gap: '8px' }}>
        <button className="btn ghost" onClick={resetDoc}>
          重置样例文档
        </button>

        {/* 宽度响应式模拟 */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontSize: '12px', color: 'var(--tk-text-muted)' }}>容器宽度:</span>
          <button
            className={`btn small ${boxWidth === 'full' ? 'primary' : 'ghost'}`}
            onClick={() => setBoxWidth('full')}
          >
            100% 满宽
          </button>
          <button
            className={`btn small ${boxWidth === 'tablet' ? 'primary' : 'ghost'}`}
            onClick={() => setBoxWidth('tablet')}
          >
            640px 平板
          </button>
          <button
            className={`btn small ${boxWidth === 'narrow' ? 'primary' : 'ghost'}`}
            onClick={() => setBoxWidth('narrow')}
          >
            420px 抽屉窄屏 (超宽体验)
          </button>
        </div>

        {/* 布局排版模式 */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontSize: '12px', color: 'var(--tk-text-muted)' }}>工具栏排版:</span>
          <button
            className={`btn small ${!multiline ? 'primary' : 'ghost'}`}
            onClick={() => setMultiline(false)}
          >
            单行平滑横滚 (默认)
          </button>
          <button
            className={`btn small ${multiline ? 'primary' : 'ghost'}`}
            onClick={() => setMultiline(true)}
          >
            自动换行 (multiline)
          </button>
        </div>
      </div>

      <div className="tiptap-box" style={{ padding: 0, ...widthStyle }}>
        <RichEditor
          value={content}
          onChange={setContent}
          placeholder="在此输入内容..."
          className="demo-rich-editor"
          multilineToolbar={multiline}
          extraToolbarActions={
            <button
              type="button"
              onClick={handleSave}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                height: '24px',
                padding: '0 8px',
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--tk-primary, #b45309)',
                background: 'color-mix(in srgb, var(--tk-primary, #b45309) 12%, transparent)',
                border: '1px solid color-mix(in srgb, var(--tk-primary, #b45309) 30%, transparent)',
                borderRadius: '9999px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
              title="保存业务文书（演示常驻插槽）"
            >
              {saveStatus ? `✓ 已保存 (${saveStatus})` : '保存文书'}
            </button>
          }
        />
      </div>

      <details className="html-dump">
        <summary>查看实时双向同步 Markdown 产物（含行内颜色标签保真）</summary>
        <pre className="code-out">{content}</pre>
      </details>

      <p className="demo-note">
        标准集成：支持受控 <code>value</code> / <code>onChange</code>，内置防光标跳动更新互斥锁，
        可直接由宿主接入替换零散的工具栏实现。
      </p>

      <div className="demo-code-ref">
        <Accordion
          id="ref-tiptap"
          title="代码参考"
          summary="RichEditor 与 EditorToolbar 的标准装配用法。"
        >
          <CodeSample label="/editor" code={SNIPPETS.editor} />
        </Accordion>
      </div>
    </DemoCard>
  );
}

export default TiptapDemo;
