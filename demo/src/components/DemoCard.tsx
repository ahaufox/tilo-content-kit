/**
 * DemoCard — 能力演示卡片共用外壳
 *
 * 职责：统一各入口演示卡的标题、入口徽章与说明排版；内容区（工具栏、
 * 输入输出、注记）由各 Demo 组件自行组织，本组件不含任何数据逻辑。
 */
import type { ReactNode } from 'react';

interface DemoCardProps {
  /** 页内锚点 id（导航与总览卡跳转用） */
  id: string;
  /** SDK 公开入口路径，如 /convert */
  entry: string;
  title: string;
  description: ReactNode;
  children: ReactNode;
}

export function DemoCard({ id, entry, title, description, children }: DemoCardProps) {
  return (
    <section id={id} className="section">
      <div className="demo-card">
        <div className="demo-card-head">
          <h3>{title}</h3>
          <code className="entry-badge">{entry}</code>
        </div>
        <p className="demo-card-desc">{description}</p>
        {children}
      </div>
    </section>
  );
}

export default DemoCard;
