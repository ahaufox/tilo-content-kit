/**
 * App — 文档站骨架：导航 / Hero / 能力总览 / 按场景接入 / 七入口演示 / 能力证据 /
 * 开发接入 / 使用文档 / 范围与边界
 *
 * 七个公开入口各自带「代码参考」折叠区（打开即看、下方贴参考代码）。
 * 「按场景接入」把同一套入口落到售后客服 / 会议纪要 / 技术文档 / 法律四类场景，
 * 避免整站读起来只服务法律行业；「使用文档」退为默认收起的完整 README（仍是
 * SDK 自身 MarkdownContent 渲染，dogfooding 不变）。
 */
import { CONTENT_KIT_VERSION } from '@tilo-ui/content-kit/theme';
import DemoSection from './DemoSection';
import ConvertDemo from './components/ConvertDemo';
import ContentDemo from './components/ContentDemo';
import LegalDemo from './components/LegalDemo';
import TiptapDemo from './components/TiptapDemo';
import CollabDemo from './components/CollabDemo';
import ThemeDemo from './components/ThemeDemo';
import ProofSection from './components/ProofSection';
import StartSection from './components/StartSection';
import BoundsSection from './components/BoundsSection';
import ScenarioSection from './components/ScenarioSection';
import DocsSection from './components/DocsSection';
import { Toc } from './components/Toc';
import { INSTALL_SNIPPETS } from './data/snippets';
import { RepoLinks } from './components/RepoLinks';

/** 七个公开入口总览（顺序即页面卡片顺序） */
const ENTRIES = [
  { href: '#demo', entry: '/markdown', name: '流式渲染', desc: 'SSE token 流实时渲染为打字机 Markdown' },
  { href: '#convert', entry: '/convert', name: '双向转换', desc: 'Markdown ⇄ HTML，编辑器与 Word 粘贴场景' },
  { href: '#content', entry: '/content', name: '形态判定与清洗', desc: 'HTML / Markdown 判定、白名单清洗、表格列宽' },
  { href: '#legal', entry: '/legal', name: '法律文书规则', desc: '文书名去重、小标题加粗、章节层级归一化（唯一带行业约束的入口）' },
  { href: '#tiptap', entry: '/editor', name: '富文本编辑器', desc: 'RichEditor 与 EditorToolbar，内置颜色、高亮与表格持久化' },
  { href: '#collab', entry: '/collab', name: '协同基座', desc: 'Yjs 协同与人机撤销隔离，AI 编辑独立回退' },
  { href: '#theme', entry: '/theme', name: '主题 token', desc: '白名单校验 + 运行时变量注入，免重建 CSS' },
] as const;

export function App() {
  return (
    <>
      <header className="nav">
        <div className="nav-inner">
          <a className="nav-brand" href="#top">
            <span className="nav-name">@tilo-ui/content-kit</span>
            <span className="nav-version">v{CONTENT_KIT_VERSION}</span>
          </a>
          <nav className="nav-links">
            <a href="#scenarios">场景方案</a>
            <a href="#proof">能力证据</a>
            <a href="#start">开发接入</a>
            <a href="#docs">文档</a>
            <RepoLinks variant="nav" />
          </nav>
        </div>
      </header>

      <div className="site">
        <main>
        <section className="hero" id="top">
          <p className="kicker">@tilo-ui/content-kit v{CONTENT_KIT_VERSION}</p>
          <h1>
            <span>把 AI 的 token 流，</span>
            <span>实时变成可编辑的文档。</span>
          </h1>
          <p className="lede">
            一套按需引入、零捆绑的内容渲染与编辑 SDK：SSE 流式 Markdown、双向转换、
            内容判定与清洗、Tiptap 表格、Yjs 协同与主题 token 契约 —— 七个入口，下方全部可交互。
            售后客服、会议纪要、技术文档、法律文书四类场景都用它，法律规则只是其中一块可选能力。
          </p>
          <div className="hero-actions">
            <a className="btn primary" href="#demo">
              在线体验流式渲染
            </a>
            <a className="btn ghost" href="#start">
              开发接入
            </a>
            <RepoLinks variant="buttons" />
          </div>
          <code className="hero-install">{INSTALL_SNIPPETS.pnpm}</code>
        </section>

        <section id="entries" className="section">
          <div className="section-head">
            <h2>能力总览</h2>
            <p className="section-sub">
              七个公开入口逐一可交互，全部按真实公开 API 演示 —— 点击卡片直达对应演示，卡片底部均附「代码参考」。
            </p>
          </div>
          <div className="entry-grid">
            {ENTRIES.map((e) => (
              <a key={e.entry} className="entry-item" href={e.href}>
                <code className="entry-badge">{e.entry}</code>
                <h4>{e.name}</h4>
                <p>{e.desc}</p>
              </a>
            ))}
          </div>
        </section>

        <ScenarioSection />

        <DemoSection />
        <ConvertDemo />
        <ContentDemo />
        <LegalDemo />
        <TiptapDemo />
        <CollabDemo />
        <ThemeDemo />

        <ProofSection />
        <StartSection />

        <DocsSection />

        <BoundsSection />
      </main>
      </div>

      <Toc />
    </>
  );
}

export default App;
