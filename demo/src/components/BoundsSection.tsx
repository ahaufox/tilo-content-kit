/**
 * BoundsSection — 范围与边界 + 页脚（对齐 demo 的 features/bounds/BoundsSection）
 *
 * 文档介绍内容之一：如实说明本站的演示边界，避免对 SDK 能力做过宽承诺。
 */
import { CONTENT_KIT_VERSION } from '@tilo-ui/content-kit/theme';

const REPO_URL = 'https://github.com/ahaufox/tilo-content-kit';

export function BoundsSection() {
  return (
    <>
      <section className="bounds" id="scope">
        <h2>范围与边界</h2>
        <p className="lede">本站是 SDK 的文档与演示，不是完整的文书生产系统。以下限制按仓库现状如实说明。</p>
        <ul>
          <li>推流接口是本页提供的合成 SSE，用来演示渲染过程，没有真实大模型或 Agent 网关。</li>
          <li>协同区只有 createIsolatedUndoManagers 与默认适配器的内存数据，没有 y-websocket 房间或鉴权。</li>
          <li>主题模板设置是合成参数；法律规则仅针对中国公文书写习惯。</li>
          <li>
            随包 CSS 消费 <code>--tk-font-body</code>，与官方 token 名 <code>--tk-font-family-body</code> 不一致，
            演示层做了桥接，并未改 SDK。
          </li>
          <li>
            <code>/editor</code> 是 <code>/tiptap</code> 的弃用别名，将在 1.0 移除，故未单独展示。
          </li>
          <li>
            源码：<a href={REPO_URL}>{REPO_URL.replace('https://', '')}</a>
          </li>
        </ul>
      </section>
      <footer className="footer">
        <span>
          @tilo-ui/content-kit {CONTENT_KIT_VERSION} · MIT License
        </span>
        <a href={`${REPO_URL}/blob/main/LICENSE`} target="_blank" rel="noreferrer">
          MIT License
        </a>
      </footer>
    </>
  );
}

export default BoundsSection;
