/**
 * collab/adapter/tilo-default — Tilo 默认 awareness 适配器
 *
 * 语义与 0.5.0 完全一致（thinking / rewriting / reviewing、30s 超时降级、
 * 块级锁兼容 string 与 {holder, expiresAt} 两种历史格式），因此宿主无需改动。
 * 需要不同产品状态机时，自行实现 `CollabAwarenessAdapter` 并传入 Hook。
 */
import type {
  AwarenessUser,
  BlockLockAwareness,
  CollabAwarenessAdapter,
  MemberStatus,
} from './types';

/** 默认状态超时阈值（ms），超过后降级为 idle */
export const DEFAULT_STATUS_TIMEOUT_MS = 30_000;

const IDLE_STATUS: MemberStatus = { state: 'idle' };

/** 从单个 peer 的 awareness state 中提取锁定块（兼容两种历史格式） */
function extractLocks(rawState: unknown): Record<string, BlockLockAwareness> {
  if (!rawState || typeof rawState !== 'object') return {};
  const raw = (rawState as Record<string, unknown>).lockedBlocks;
  if (!raw || typeof raw !== 'object') return {};
  const out: Record<string, BlockLockAwareness> = {};
  for (const [blockId, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === 'string') {
      out[blockId] = { holder: value };
    } else if (value && typeof value === 'object') {
      const v = value as Record<string, unknown>;
      const holder = typeof v.holder === 'string' ? v.holder : '';
      const expiresAt = typeof v.expiresAt === 'string' ? v.expiresAt : undefined;
      out[blockId] = { holder, expiresAt };
    }
  }
  return out;
}

/**
 * Tilo 默认适配器。
 *
 * - AI 判定：`user.type === 'ai'`
 * - 状态归一化：缺省 idle；`updatedAt` 超过 `statusTimeoutMs` 且非 idle 时降级 idle
 * - 块级锁：兼容 `{ holder, expiresAt }` 与 `holder` 字符串
 * - 正在改写：`state === 'rewriting'`
 */
export const tiloAwarenessAdapter: CollabAwarenessAdapter = {
  statusTimeoutMs: DEFAULT_STATUS_TIMEOUT_MS,

  isAi(user: AwarenessUser | undefined): boolean {
    return user?.type === 'ai';
  },

  normalizeStatus(rawState: unknown): MemberStatus {
    const status = (rawState as { status?: Record<string, unknown> } | undefined)?.status;
    if (!status) return IDLE_STATUS;

    const state = (status.state as MemberStatus['state']) || 'idle';
    const currentBlockId = typeof status.currentBlockId === 'string' ? status.currentBlockId : undefined;
    const updatedAt = typeof status.updatedAt === 'string' ? status.updatedAt : undefined;
    const message = typeof status.message === 'string' ? status.message : undefined;

    if (updatedAt && state !== 'idle') {
      const elapsed = Date.now() - new Date(updatedAt).getTime();
      if (elapsed > DEFAULT_STATUS_TIMEOUT_MS) {
        return { state: 'idle', currentBlockId: undefined, updatedAt, message };
      }
    }

    return { state, currentBlockId, updatedAt, message };
  },

  readLocks(rawState: unknown): Record<string, BlockLockAwareness> {
    return extractLocks(rawState);
  },

  isActiveRewriter(status: MemberStatus): boolean {
    return status.state === 'rewriting';
  },
};

/** 生成 fallback 颜色：按 clientId 哈希取 RGB（黄金比例近似） */
export function generateFallbackColor(clientId: number): string {
  const hash = (clientId * 2654435761) >>> 0;
  const r = (hash >> 16) & 0xff;
  const g = (hash >> 8) & 0xff;
  const b = hash & 0xff;
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

/** 生成 fallback 名称：'User' + clientId % 100 */
export function generateFallbackName(clientId: number): string {
  return `User${clientId % 100}`;
}
