/**
 * collab/useBlockLocks — Yjs Awareness 块级锁订阅
 *
 * 职责：监听 WebsocketProvider 的 awareness 变化，从其他 peer 的 state 中提取
 * 块级锁（字段形态由适配器的 `readLocks` 决定），过滤本地 peer，返回活跃锁定集合。
 *
 * 上收说明：0.5.0 自宿主 @/lib/yjs 上收；0.7.0 起锁字段解析交给适配器，
 * 默认适配器兼容 `{ holder, expiresAt }` 与 `holder` 字符串两种历史格式。
 */
import { useEffect, useState, useRef, useMemo } from 'react';
import type { WebsocketProvider } from 'y-websocket';
import type {
  BlockLockAwareness,
  CollabAwarenessAdapter,
  CollabStatus,
} from './adapter/types';
import { tiloAwarenessAdapter } from './adapter/tilo-default';

export type { BlockLockAwareness };

export interface UseBlockLocksOptions<TState extends string = CollabStatus> {
  /** WebsocketProvider 实例，可为 null（房间未就绪时） */
  provider: WebsocketProvider | null;
  /** 本地 clientId；不传时自动取 provider.awareness.clientID */
  localClientId?: number;
  /** 兜底定时器间隔（毫秒），默认 1000ms */
  fallbackIntervalMs?: number;
  /** 产品语义适配器（决定锁字段如何解析），默认 tiloAwarenessAdapter */
  adapter?: CollabAwarenessAdapter<TState>;
}

export interface UseBlockLocksResult {
  /** 当前活跃的锁定 blockId 集合（来自所有非本地 peer） */
  lockedBlockIds: Set<string>;
  /** 完整的 awareness 状态（含 holder / expiresAt），key 为 blockId */
  lockStates: Map<string, BlockLockAwareness>;
}

export function useBlockLocks<TState extends string = CollabStatus>({
  provider,
  localClientId,
  fallbackIntervalMs = 1000,
  adapter = tiloAwarenessAdapter as CollabAwarenessAdapter<TState>,
}: UseBlockLocksOptions<TState>): UseBlockLocksResult {
  const [lockStates, setLockStates] = useState<Map<string, BlockLockAwareness>>(() => new Map());
  const lockStatesRef = useRef<Map<string, BlockLockAwareness>>(new Map());

  // 维护一个 ref 用于在 fallback timer 内读写最新状态
  useEffect(() => {
    lockStatesRef.current = lockStates;
  }, [lockStates]);

  useEffect(() => {
    if (!provider) return;

    const awareness = provider.awareness;
    // 防御守卫：mock / 半初始化 provider 可能缺 awareness 实例或其方法，安全降级为空集合
    if (!awareness || typeof awareness.getStates !== 'function') return;
    const myClientId = localClientId ?? awareness.clientID;

    const recompute = () => {
      const merged = new Map<string, BlockLockAwareness>();
      const states = awareness.getStates();
      for (const [clientId, state] of states.entries()) {
        if (clientId === myClientId) continue; // 过滤本地 peer
        const locks = adapter.readLocks(state);
        for (const [blockId, info] of Object.entries(locks)) {
          // 多 peer 持锁同 blockId 时，保留最新 holder（后到优先）
          merged.set(blockId, info);
        }
      }
      lockStatesRef.current = merged;
      setLockStates(merged);
    };

    // 初始读取
    recompute();

    awareness.on('change', recompute);

    return () => {
      awareness.off('change', recompute);
    };
  }, [provider, localClientId, adapter]);

  // 兜底定时器：清理 expiresAt 已过期的 blockId
  useEffect(() => {
    const timer = setInterval(() => {
      // 快速路径：若当前无锁，跳过过期比对
      if (lockStatesRef.current.size === 0) return;

      const now = Date.now();
      let changed = false;
      const next = new Map<string, BlockLockAwareness>();
      for (const [blockId, info] of lockStatesRef.current.entries()) {
        if (info.expiresAt) {
          const exp = Date.parse(info.expiresAt);
          if (!Number.isNaN(exp) && exp <= now) {
            changed = true;
            continue; // 跳过过期的
          }
        }
        next.set(blockId, info);
      }
      if (changed) {
        lockStatesRef.current = next;
        setLockStates(next);
      }
    }, fallbackIntervalMs);

    return () => clearInterval(timer);
  }, [fallbackIntervalMs]);

  // 使用 useMemo 稳定 lockedBlockIds 引用，避免下游组件因每次渲染生成新 Set 产生无效重算
  const lockedBlockIds = useMemo(() => new Set(lockStates.keys()), [lockStates]);

  return {
    lockedBlockIds,
    lockStates,
  };
}
