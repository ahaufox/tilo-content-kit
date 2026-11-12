/**
 * Toc — 长页面浮动目录 + 回到顶部
 *
 * 宽屏（≥ 1540px）默认展开为右下角浮动目录：此时版心（1080px）右侧留白超过
 * 188px 面板 + 边距，目录压在空白处而不遮正文；
 * 其余宽度收起为一个「目录」按钮，点开浮在内容之上 —— 初始展开态由 matchMedia
 * 决定，视觉由 CSS 媒体查询决定。宽屏下 toggle 按钮被 CSS 隐藏，所以所有「收起」
 * 动作（Esc / 外点 / 链接跳转 / 回到顶部）都要先判宽度，否则面板会关死没入口重开。
 *
 * 高亮用 IntersectionObserver 监听各 section 与阅读区（视口上 24% ~ 下 40%）
 * 的交集，取文档顺序最靠前的一个写入 aria-current="location"；浏览器不支持
 * IntersectionObserver 时不注册任何监听，目录退化为普通锚点导航（链接照常可用）。
 */
import { useEffect, useRef, useState } from 'react';

/** 目录条目：id 与页面 section 锚点一一对应，顺序即页面顺序 */
const SECTIONS = [
  { id: 'top', label: '概览' },
  { id: 'entries', label: '能力总览' },
  { id: 'scenarios', label: '按场景接入' },
  { id: 'demo', label: '流式渲染' },
  { id: 'convert', label: '双向转换' },
  { id: 'content', label: '形态判定与清洗' },
  { id: 'legal', label: '法律文书规则' },
  { id: 'tiptap', label: '表格编辑器' },
  { id: 'collab', label: '协同基座' },
  { id: 'theme', label: '主题 token' },
  { id: 'proof', label: '能力证据' },
  { id: 'start', label: '开发接入' },
  { id: 'docs', label: '使用文档' },
  { id: 'scope', label: '范围与边界' },
] as const;

const WIDE_QUERY = '(min-width: 1540px)';

/** 宽屏下目录常驻展开、toggle 按钮被 CSS 隐藏，任何「收起」都必须先过这道闸 */
const isWide = () => window.matchMedia(WIDE_QUERY).matches;

export function Toc() {
  const [active, setActive] = useState<string>(SECTIONS[0].id);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // 初始展开态与断点联动：桌面常驻展开，窄屏收起，跨断点时保持规则而不是沿用旧状态
  useEffect(() => {
    const mq = window.matchMedia(WIDE_QUERY);
    const sync = () => setOpen(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  // 滚动高亮：视口上下各裁一段，构成阅读区，交集内的 section 按文档顺序取第一个
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const targets = SECTIONS.map((s) => document.getElementById(s.id)).filter(
      (el): el is HTMLElement => el !== null,
    );
    if (targets.length === 0) return;

    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        // 阅读区只是视口中间一段，页面末尾几个短 section 挤不进去会永远不上榜；
        // 触底时直接认定最后一个 section。与高亮同处一个回调，避免两条通道互相覆盖。
        const atBottom =
          window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
        const first = atBottom
          ? SECTIONS[SECTIONS.length - 1]
          : SECTIONS.find((s) => visible.has(s.id));
        if (first) setActive(first.id);
      },
      { rootMargin: '-24% 0px -40% 0px' },
    );
    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // 窄屏展开时：Esc 或点击面板外关闭（宽屏常驻，不需要）
  // 宽屏判断必须在回调内求值：订阅发生在窄屏，跨断点拉宽后监听器仍在，
  // 若沿用订阅时的求值结果，宽屏下一次外点就会关掉面板且再没有入口重开
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isWide()) setOpen(false);
    };
    const onPointerDown = (e: PointerEvent) => {
      if (!isWide() && !rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onPointerDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  const backToTop = () => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    if (!isWide()) setOpen(false);
  };

  return (
    <div className={`toc${open ? ' open' : ''}`} ref={rootRef}>
      <button
        type="button"
        className="toc-toggle"
        aria-expanded={open}
        aria-controls="toc-panel"
        onClick={() => setOpen((v) => !v)}
      >
        目录
      </button>

      <div className="toc-panel" id="toc-panel" hidden={!open}>
        <p className="toc-title">本页内容</p>
        <nav aria-label="页面目录">
          <ol className="toc-list">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  aria-current={active === s.id ? 'location' : undefined}
                  onClick={() => {
                    if (!isWide()) setOpen(false);
                  }}
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <button type="button" className="toc-top" onClick={backToTop}>
          ↑ 回到顶部
        </button>
      </div>
    </div>
  );
}

export default Toc;
