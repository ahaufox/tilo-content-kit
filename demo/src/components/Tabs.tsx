/**
 * Tabs — 分段切换控件（对齐站点既有 .demo-tabs 视觉）
 *
 * 只负责 role="tablist" 语义与高亮态，不含任何业务状态：
 * value / onChange 由调用方持有，DemoSection、ConvertDemo、InstallTabs 与
 * SplitPanes（移动端左右对照降级）复用同一套实现与样式。
 */
export interface TabItem<T extends string = string> {
  id: T;
  label: string;
}

export function Tabs<T extends string>({
  items,
  value,
  onChange,
  label,
}: {
  items: ReadonlyArray<TabItem<T>>;
  value: T;
  onChange: (id: T) => void;
  label: string;
}) {
  return (
    <div className="demo-tabs" role="tablist" aria-label={label}>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={value === item.id}
          className={value === item.id ? 'demo-tab active' : 'demo-tab'}
          onClick={() => onChange(item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export default Tabs;
