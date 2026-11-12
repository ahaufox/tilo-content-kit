/**
 * Toast — 关键交互的即时反馈气泡（useToast + Toast）
 *
 * 用法：
 *   const toast = useToast();
 *   <span className="toast-anchor">
 *     <button onClick={() => { doIt(); toast.show('已写入'); }}>…</button>
 *     <Toast toast={toast.toast} />
 *   </span>
 *
 * 无障碍：常驻一个 role="status" aria-live="polite" 的空槽位，只换其文本，
 * 屏幕阅读器才能读到后续变化（临时挂载的 live region 不会被播报）。
 */
import { useCallback, useEffect, useRef, useState } from 'react';

export interface ToastState {
  /** 递增 id，用作 key 强制重放动画 */
  id: number;
  message: string;
}

export function useToast(duration = 1600) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<number | undefined>(undefined);
  // 自增计数器而非 Date.now()：同毫秒连击时间戳相同，key 不变则动画不重放
  const seq = useRef(0);

  const show = useCallback(
    (message: string) => {
      seq.current += 1;
      setToast({ id: seq.current, message });
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setToast(null), duration);
    },
    [duration],
  );

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return { toast, show };
}

export function Toast({ toast }: { toast: ToastState | null }) {
  return (
    <span className="toast-slot" role="status" aria-live="polite">
      {toast ? (
        <span key={toast.id} className="toast-bubble">
          {toast.message}
        </span>
      ) : null}
    </span>
  );
}

export default Toast;
