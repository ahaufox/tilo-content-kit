/**
 * Accordion — 折叠面板（对齐 demo 的 ui/Accordion）
 *
 * 用于「代码参考」：点击标题展开/收起，面板内可放参考代码、输入输出或说明。
 * 标题区含主标题（strong）与副说明（em），右侧给出展开/收起状态。
 */
import { useId, useState, type ReactNode } from 'react';

export function Accordion({
  id,
  title,
  summary,
  children,
  defaultOpen = false,
}: {
  id: string;
  title: string;
  summary: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();
  return (
    <div className={`acc ${open ? 'open' : ''}`} id={id}>
      <h3>
        <button
          type="button"
          className="acc-btn"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((v) => !v)}
        >
          <span>
            <strong>{title}</strong>
            <em>{summary}</em>
          </span>
          <span className="acc-mark" aria-hidden="true">
            {open ? '收起' : '展开'}
          </span>
        </button>
      </h3>
      <div id={panelId} hidden={!open} className="acc-panel">
        {children}
      </div>
    </div>
  );
}

export default Accordion;
