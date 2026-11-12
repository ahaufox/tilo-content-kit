/**
 * collab/useCollabMembers — Yjs Awareness 协同成员订阅
 *
 * 职责：监听 WebsocketProvider 的 awareness 变化，经适配器把每个 peer 的
 * user / status / lockedBlocks 归一化为成员视图，过滤本地 peer，并按类型分类。
 *
 * 产品语义由适配器注入（见 ./adapter/types）：
 *   - 默认使用 `tiloAwarenessAdapter`（thinking / rewriting / reviewing + 30s 超时降级）；
 *   - 其他产品可传入自定义适配器，SDK 不感知其状态取值。
 *
 * 上收说明：0.5.0 自宿主 @/lib/yjs 上收；0.7.0 起产品状态机外置为适配器，
 * 本文件只保留订阅、去抖与超时巡检逻辑。
 */
import { useRef, useState, useEffect } from 'react';
import type { WebsocketProvider } from 'y-websocket';
import type {
  AwarenessUser,
  CollabAwarenessAdapter,
  CollabMember,
  CollabStatus,
  UseCollabMembersResult,
} from './adapter/types';
import {
  generateFallbackColor,
  generateFallbackName,
  tiloAwarenessAdapter,
} from './adapter/tilo-default';

export type {
  AwarenessState,
  AwarenessStatus,
  AwarenessUser,
  BlockLockAwareness,
  CollabAwarenessAdapter,
  CollabMember,
  CollabStatus,
  MemberStatus,
  UseCollabMembersResult,
} from './adapter/types';
export { generateFallbackColor, generateFallbackName, tiloAwarenessAdapter };

const EMPTY_RESULT: UseCollabMembersResult = {
  members: [],
  humanMembers: [],
  aiMembers: [],
  activeRewriters: [],
};

/** 主动超时巡检间隔（ms）：仅有非 idle 的 AI 成员时才重算 */
const INSPECTION_INTERVAL_MS = 5_000;

/** awareness 变化后的去抖间隔（ms） */
const CHANGE_DEBOUNCE_MS = 100;

/**
 * 比较新旧成员列表的关键业务属性，判断是否发生实质变更。
 */
export function areMemberListsEqual<TState extends string = CollabStatus>(
  prev: CollabMember<TState>[],
  next: CollabMember<TState>[],
): boolean {
  if (prev === next) return true;
  if (prev.length !== next.length) return false;

  for (let i = 0; i < prev.length; i++) {
    const a = prev[i];
    const b = next[i];
    if (
      a.clientId !== b.clientId ||
      a.name !== b.name ||
      a.color !== b.color ||
      a.type !== b.type ||
      a.avatar !== b.avatar ||
      a.status.state !== b.status.state ||
      a.status.currentBlockId !== b.status.currentBlockId ||
      a.status.message !== b.status.message ||
      a.status.updatedAt !== b.status.updatedAt ||
      a.isActiveRewriter !== b.isActiveRewriter ||
      a.heldBlockIds.length !== b.heldBlockIds.length
    ) {
      return false;
    }
    for (let j = 0; j < a.heldBlockIds.length; j++) {
      if (a.heldBlockIds[j] !== b.heldBlockIds[j]) return false;
    }
  }
  return true;
}

/** 提取用户信息；缺失时使用 clientId 派生的 fallback */
function extractUser(
  state: unknown,
  clientId: number,
): { name: string; color: string; type: 'human' | 'ai'; avatar?: string } {
  const user = (state as { user?: AwarenessUser } | undefined)?.user;
  if (!user) {
    return {
      name: generateFallbackName(clientId),
      color: generateFallbackColor(clientId),
      type: 'human',
    };
  }
  return {
    name: user.name || generateFallbackName(clientId),
    color: user.color || generateFallbackColor(clientId),
    type: user.type === 'ai' ? 'ai' : 'human',
    avatar: user.avatar,
  };
}

/**
 * 从 provider 的 awareness 计算成员列表（纯函数，无副作用）。
 */
export function computeMembers<TState extends string = CollabStatus>(
  provider: WebsocketProvider | null,
  adapter: CollabAwarenessAdapter<TState> = tiloAwarenessAdapter as CollabAwarenessAdapter<TState>,
): UseCollabMembersResult<TState> {
  if (!provider) return EMPTY_RESULT as UseCollabMembersResult<TState>;

  const awareness = provider.awareness;
  // 防御守卫：mock / 半初始化 provider 可能缺 awareness 实例
  if (!awareness || typeof awareness.getStates !== 'function') {
    return EMPTY_RESULT as UseCollabMembersResult<TState>;
  }

  const myClientId = awareness.clientID;
  const states = awareness.getStates();
  const members: CollabMember<TState>[] = [];

  for (const [clientId, rawState] of states.entries()) {
    if (clientId === myClientId) continue; // 过滤本地 peer

    const user = extractUser(rawState, clientId);
    const status = adapter.normalizeStatus(rawState);
    const locks = adapter.readLocks(rawState);
    const isActiveRewriter = adapter.isActiveRewriter
      ? adapter.isActiveRewriter(status)
      : status.state === 'rewriting';

    members.push({
      clientId,
      name: user.name,
      color: user.color,
      type: adapter.isAi(user) ? 'ai' : 'human',
      avatar: user.avatar,
      status,
      heldBlockIds: Object.keys(locks),
      isActiveRewriter,
      lastSeen: Date.now(),
    });
  }

  return {
    members,
    humanMembers: members.filter(m => m.type === 'human'),
    aiMembers: members.filter(m => m.type === 'ai'),
    activeRewriters: members.filter(m => m.isActiveRewriter),
  };
}

export interface UseCollabMembersOptions<TState extends string = CollabStatus> {
  /** 产品语义适配器，默认 tiloAwarenessAdapter */
  adapter?: CollabAwarenessAdapter<TState>;
}

/**
 * useCollabMembers — 订阅协同房间成员状态。
 *
 * @param provider - y-websocket WebsocketProvider 实例
 * @param options  - 可选：自定义 awareness 适配器
 * @returns 成员列表及分类视图
 */
export function useCollabMembers<TState extends string = CollabStatus>(
  provider: WebsocketProvider | null,
  options: UseCollabMembersOptions<TState> = {},
): UseCollabMembersResult<TState> {
  const adapter = options.adapter ?? (tiloAwarenessAdapter as CollabAwarenessAdapter<TState>);
  const [result, setResult] = useState<UseCollabMembersResult<TState>>(
    () => computeMembers(provider, adapter),
  );
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!provider) return;

    const awareness = provider.awareness;
    if (!awareness || typeof awareness.getStates !== 'function') return;

    const refresh = (prevResult: UseCollabMembersResult<TState>): UseCollabMembersResult<TState> => {
      const nextResult = computeMembers(provider, adapter);
      return areMemberListsEqual(prevResult.members, nextResult.members) ? prevResult : nextResult;
    };

    // 初始同步（延迟到 effect 之后，避免 cascading render）
    const initTimer = setTimeout(() => setResult(refresh), 0);

    const handleChange = () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => setResult(refresh), CHANGE_DEBOUNCE_MS);
    };
    awareness.on('change', handleChange);

    // 主动超时巡检：仅在存在非 idle 的 AI 成员时才重算（适配器负责判定过期）
    const inspectionInterval = setInterval(() => {
      setResult((prevResult) => {
        const hasActiveAi = prevResult.aiMembers.some((m) => m.status.state !== 'idle');
        return hasActiveAi ? refresh(prevResult) : prevResult;
      });
    }, INSPECTION_INTERVAL_MS);

    return () => {
      clearTimeout(initTimer);
      clearInterval(inspectionInterval);
      awareness.off('change', handleChange);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [provider, adapter]);

  return result;
}
