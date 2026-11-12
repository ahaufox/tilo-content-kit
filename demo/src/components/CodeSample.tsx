/**
 * CodeSample — 参考代码片段卡片（对齐 demo 的 ui/CodeSample）
 *
 * 由深色代码块 + 复制按钮组成。本组件不含业务逻辑，仅负责展示与复制。
 */
import { useState } from 'react';

export function CopyButton({ text, className }: { text: string; className?: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      className={`btn ghost sm ${className ?? ''}`.trim()}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setOk(true);
          window.setTimeout(() => setOk(false), 1600);
        } catch {
          setOk(false);
        }
      }}
    >
      {ok ? '已复制' : '复制'}
    </button>
  );
}

export function CodeSample({ code, label }: { code: string; label?: string }) {
  return (
    <div className="code-block">
      <div className="code-meta">
        <span>{label ?? '示例'}</span>
        <CopyButton text={code} />
      </div>
      <pre>
        <code>{code}</code>
      </pre>
    </div>
  );
}

export default CodeSample;
