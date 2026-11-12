/**
 * SplitPanes — 左右对照面板，窄屏降级为上下 Tabs
 *
 * 桌面（> 768px）：两栏并排，切换控件隐藏，对照关系一眼可见。
 * 窄屏（≤ 768px）：原生 CSS 媒体查询隐藏未选中栏、显示 Tabs —— 不引入
 * 额外的响应式框架，也不需要 JS 监听视口。
 */
import { useState, type ReactNode } from 'react';
import { Tabs } from './Tabs';

export interface Pane {
  id: string;
  /** Tabs 上的标签（窄屏才可见） */
  label: string;
  /** 附加类名，如 collab-pane / collab-pane ai */
  className?: string;
  content: ReactNode;
}

export function SplitPanes({ panes, label }: { panes: Pane[]; label: string }) {
  const [active, setActive] = useState(panes[0].id);
  return (
    <div className="split-panes">
      <div className="split-tabs">
        <Tabs
          items={panes.map((p) => ({ id: p.id, label: p.label }))}
          value={active}
          onChange={setActive}
          label={label}
        />
      </div>
      <div className="split-body">
        {panes.map((pane) => (
          <div
            key={pane.id}
            className={['split-pane', pane.className, pane.id === active ? 'active' : '']
              .filter(Boolean)
              .join(' ')}
          >
            {pane.content}
          </div>
        ))}
      </div>
    </div>
  );
}

export default SplitPanes;
