/**
 * DocsSection — 使用文档（完整 README，默认收起）
 *
 * 站点原先把整份 README 直接铺在「使用文档」里，与上方演示重复。现在这里退为
 * 参考资料：默认折叠，需要查完整入口表 / 安装说明时再展开。展开后的内容仍由
 * SDK 自身的 MarkdownContent 渲染（dogfooding），代码块带复制按钮。
 */
import { MarkdownContent } from '@tilo-ui/content-kit/markdown';
import { Accordion } from './Accordion';
import { docsMarkdownComponents } from './docsMarkdown';
// Vite ?raw：以纯文本形式内联仓库根 README，交由 SDK 渲染
import readmeRaw from '../../../README.md?raw';

export function DocsSection() {
  return (
    <section id="docs" className="section">
      <div className="section-head">
        <h2>使用文档</h2>
        <p className="section-sub">
          完整说明只此一处：入口表、安装、SSE 对接、参与开发的约定。日常接入看上面的
          「按场景接入」就够，需要查细节时再展开。
        </p>
      </div>
      <div className="demo-card">
        <Accordion
          id="ref-readme"
          title="完整 README"
          summary="入口职责表、安装、SSE 对接、参与开发与范围边界（由 SDK 渲染仓库 README）"
        >
          <article className="docs-panel">
            <MarkdownContent content={readmeRaw} components={docsMarkdownComponents} />
          </article>
        </Accordion>
      </div>
    </section>
  );
}

export default DocsSection;
