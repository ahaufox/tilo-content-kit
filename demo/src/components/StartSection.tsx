/**
 * StartSection — 开发接入（对齐 demo 的 features/start/StartSection）
 *
 * 文档介绍内容之一：给出包名、当前版本、安装命令与最小流式接入片段。
 * 安装命令走 InstallTabs（pnpm / npm / yarn 等价切换，默认 pnpm），
 * 命令字符串统一来自 data/snippets 的 INSTALL_SNIPPETS，避免与 Hero 各写一份。
 * 入口彼此独立，用哪块引哪块；React、Tiptap、Yjs 等由宿主提供。
 */
import { CONTENT_KIT_VERSION } from '@tilo-ui/content-kit/theme';
import { CodeSample } from './CodeSample';
import { InstallTabs } from './InstallTabs';
import { SNIPPETS } from '../data/snippets';

export function StartSection() {
  return (
    <section className="chapter" id="start" aria-labelledby="start-title">
      <div className="start-grid">
        <div className="chapter-head" style={{ marginBottom: 0 }}>
          <p className="step">开发接入</p>
          <h2 id="start-title">先把流式渲染接上，其余按需引入。</h2>
          <p className="lede">
            包名 <code>@tilo-ui/content-kit</code>，当前版本 {CONTENT_KIT_VERSION}。React、Tiptap、Yjs 等由宿主提供。
            入口彼此独立，用哪块引哪块。
          </p>
          <InstallTabs className="start-install" />
        </div>
        <CodeSample label="最小流式接入" code={SNIPPETS.start} />
      </div>
    </section>
  );
}

export default StartSection;
