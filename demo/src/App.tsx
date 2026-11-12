/**
 * App — 文档站骨架：导航 / Hero / 能力总览 / 七入口演示 / 能力证据 / 开发接入 / README 文档 / 范围与边界
 *
 * Hero 顶部设计与 Proof/Start/Bounds 文档介绍内容参考 tilo-content-kit-demo 的
 * 产品展示站；七个公开入口各自带「代码参考」折叠区（打开即看、下方贴参考代码）。
 * 落地页部分直接用 SDK 自身的 MarkdownContent 渲染仓库 README（dogfooding）。
 */
import { MarkdownContent } from '@tilo-ui/content-kit/markdown';
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
// Vite ?raw：以纯文本形式内联仓库根 README，交由 SDK 渲染
import readmeRaw from '../../README.md?raw';

const REPO_URL = 'https://github.com/ahaufox/tilo-content-kit';

/** 七个公开入口总览（顺序即页面卡片顺序） */
const ENTRIES = [
  { href: '#demo', entry: '/markdown', name: '流式渲染', desc: 'SSE token 流实时渲染为打字机 Markdown' },
  { href: '#convert', entry: '/convert', name: '双向转换', desc: 'Markdown ⇄ HTML，编辑器与 Word 粘贴场景' },
  { href: '#content', entry: '/content', name: '形态判定与清洗', desc: 'HTML / Markdown 判定、白名单清洗、表格列宽' },
  { href: '#legal', entry: '/legal', name: '法律文书规则', desc: '文书名去重、小标题加粗、章节层级归一化' },
  { href: '#tiptap', entry: '/tiptap', name: '表格编辑器', desc: 'ResizableTable 列宽持久化到文档模型' },
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
            <a href="#proof">能力证据</a>
            <a href="#start">开发接入</a>
            <a href="#docs">文档</a>
            <a href={REPO_URL} target="_blank" rel="noreferrer">
              GitHub
            </a>
          </nav>
        </div>
      </header>

      <div className="site">
        <main id="top">
        <section className="hero">
          <p className="kicker">@tilo-ui/content-kit v{CONTENT_KIT_VERSION}</p>
          <h1>
            <span>把 AI 的 token 流，</span>
            <span>实时变成可编辑的文档。</span>
          </h1>
          <p className="lede">
            一套按需引入、零捆绑的内容渲染与编辑 SDK，脱胎于真实的
            法律文书生产系统：SSE 流式 Markdown、双向转换、内容判定与清洗、法律文书规则、
            Tiptap 表格、Yjs 协同与主题 token 契约 —— 七个入口，下方全部可交互。
          </p>
          <div className="hero-actions">
            <a className="btn primary" href="#demo">
              在线体验流式渲染
            </a>
            <a className="btn ghost" href="#start">
              开发接入
            </a>
            <a className="btn ghost" href={REPO_URL} target="_blank" rel="noreferrer">
              源码仓库
            </a>
          </div>
          <code className="hero-install">pnpm add @tilo-ui/content-kit@{CONTENT_KIT_VERSION}</code>
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

        <DemoSection />
        <ConvertDemo />
        <ContentDemo />
        <LegalDemo />
        <TiptapDemo />
        <CollabDemo />
        <ThemeDemo />

        <ProofSection />
        <StartSection />

        <section id="docs" className="section">
          <div className="section-head">
            <h2>使用文档</h2>
            <p className="section-sub">
              以下内容直接由 SDK 自身的 MarkdownContent 渲染仓库 README —— 本站即为渲染效果的真实样例。
            </p>
          </div>
          <article className="docs-panel">
            <MarkdownContent content={readmeRaw} />
          </article>
        </section>

        <BoundsSection />
      </main>
      </div>
    </>
  );
}

export default App;
