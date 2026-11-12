/**
 * Demo 站 Toc / Toast 的两处守卫回归：
 * - 宽屏（≥1540px）下目录常驻展开，任何关闭动作都不该把面板关死（toggle 被 CSS 隐藏）
 * - Toast 的 id 必须是自增计数，Date.now() 同毫秒连击会让 key 不变、动画不重放
 */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { Toc } from '../demo/src/components/Toc';
import { Toast, useToast } from '../demo/src/components/Toast';

let width = 1000;
const listeners = new Set<() => void>();
const origMM = window.matchMedia;
window.matchMedia = ((q: string) => {
  const wide = q.includes('1540');
  return {
    get matches() { return wide ? width >= 1540 : false; },
    media: q,
    onchange: null,
    addEventListener: (_: string, cb: () => void) => { if (wide) listeners.add(cb); },
    removeEventListener: (_: string, cb: () => void) => { if (wide) listeners.delete(cb); },
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  } as unknown as MediaQueryList;
}) as typeof window.matchMedia;
window.scrollTo = (() => {}) as typeof window.scrollTo;

function resize(next: number) {
  width = next;
  act(() => listeners.forEach((cb) => cb()));
}

describe('Toc 宽屏守卫', () => {
  beforeEach(() => { width = 1540; listeners.clear(); });
  afterAll(() => { window.matchMedia = origMM; });

  it('宽屏点「回到顶部」后面板仍展开', () => {
    render(<Toc />);
    const panel = document.getElementById('toc-panel')!;
    expect(panel.hasAttribute('hidden')).toBe(false);
    fireEvent.click(screen.getByText('↑ 回到顶部'));
    expect(panel.hasAttribute('hidden')).toBe(false);
  });

  it('窄屏开着目录再拉宽到宽屏，外点/Esc 不再关面板', () => {
    width = 1000;
    render(<Toc />);
    const toggle = screen.getByText('目录');
    const panel = document.getElementById('toc-panel')!;
    fireEvent.click(toggle);
    expect(panel.hasAttribute('hidden')).toBe(false);
    resize(1540);
    expect(panel.hasAttribute('hidden')).toBe(false);
    fireEvent.pointerDown(document.body);
    expect(panel.hasAttribute('hidden')).toBe(false);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(panel.hasAttribute('hidden')).toBe(false);
  });

  it('窄屏外点仍能正常关闭', () => {
    width = 1000;
    render(<Toc />);
    const panel = document.getElementById('toc-panel')!;
    fireEvent.click(screen.getByText('目录'));
    fireEvent.pointerDown(document.body);
    expect(panel.hasAttribute('hidden')).toBe(true);
  });
});

describe('Toast id', () => {
  function Harness() {
    const t = useToast(100000);
    return (
      <div>
        <button onClick={() => t.show('A')}>A</button>
        <button onClick={() => t.show('B')}>B</button>
        <Toast toast={t.toast} />
      </div>
    );
  }
  it('同毫秒连续点击也让气泡节点重建（动画重放）', () => {
    // 冻结时钟：Date.now() 作 key 时两次点击的 key 完全相同，React 不会重挂节点
    const now = vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    try {
      render(<Harness />);
      fireEvent.click(screen.getByText('A'));
      const first = document.querySelector('.toast-bubble');
      fireEvent.click(screen.getByText('B'));
      const second = document.querySelector('.toast-bubble');
      expect(first).not.toBe(second);
      expect(second?.textContent).toBe('B');
    } finally {
      now.mockRestore();
    }
  });
});
