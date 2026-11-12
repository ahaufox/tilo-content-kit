/**
 * useBlockLocks Hook 单元测试
 *
 * 任务编号：T042, T043
 * 测试目标：验证 useBlockLocks Hook 正确订阅 awareness 状态变化并返回锁定 blockId 集合
 *
 * TDD 流程：
 *   1. 本测试文件在 useBlockLocks 实现前已存在，作为失败测试（Red）
 *   2. useBlockLocks.ts 实现后，本测试转绿（Green）
 *   3. 后续重构保持转绿（Refactor）
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBlockLocks } from '../src/collab';
import * as Y from 'yjs'; // eslint-disable-line @typescript-eslint/no-unused-vars

// 创建一个最小的 WebsocketProvider mock（仅暴露 awareness 协议）
function createMockProvider(myClientId: number) {
  const states = new Map<number, Record<string, unknown>>();
  const listeners: Array<() => void> = [];

  const awareness = {
    clientID: myClientId,
    getStates: () => states,
    setLocalState: (state: Record<string, unknown>) => {
      states.set(myClientId, state);
      listeners.forEach(fn => fn());
    },
    setRemoteState: (clientId: number, state: Record<string, unknown>) => {
      states.set(clientId, state);
      listeners.forEach(fn => fn());
    },
    removeRemoteState: (clientId: number) => {
      states.delete(clientId);
      listeners.forEach(fn => fn());
    },
    on: (event: string, fn: () => void) => {
      if (event === 'change') listeners.push(fn);
    },
    off: (event: string, fn: () => void) => {
      if (event === 'change') {
        const idx = listeners.indexOf(fn);
        if (idx >= 0) listeners.splice(idx, 1);
      }
    },
  };

  return {
    awareness,
    destroy: () => {},
  };
}

describe('useBlockLocks', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('T042: 在 awareness change 事件触发时返回最新 Set<blockId>', () => {
    const myClientId = 100;
    const remoteClientId = 200;
    const mockProvider = createMockProvider(myClientId) as unknown as Parameters<typeof useBlockLocks>[0]['provider'];

    const { result } = renderHook(() =>
      useBlockLocks({ provider: mockProvider, fallbackIntervalMs: 1000 })
    );

    // 初始状态：没有锁
    expect(result.current.lockedBlockIds.size).toBe(0);

    // 模拟其他 peer 锁定一个区块
    act(() => {
      (mockProvider!.awareness as unknown as ReturnType<typeof createMockProvider>['awareness'])
        .setRemoteState(remoteClientId, {
          lockedBlocks: {
            'block-A': { holder: 'peer-200', expiresAt: new Date(Date.now() + 60000).toISOString() },
          },
        });
    });

    // 应当包含此 blockId
    expect(result.current.lockedBlockIds.has('block-A')).toBe(true);
    expect(result.current.lockedBlockIds.size).toBe(1);

    // 模拟锁定第二个区块
    act(() => {
      (mockProvider!.awareness as unknown as ReturnType<typeof createMockProvider>['awareness'])
        .setRemoteState(remoteClientId, {
          lockedBlocks: {
            'block-A': { holder: 'peer-200' },
            'block-B': { holder: 'peer-200' },
          },
        });
    });

    expect(result.current.lockedBlockIds.size).toBe(2);
    expect(result.current.lockedBlockIds.has('block-A')).toBe(true);
    expect(result.current.lockedBlockIds.has('block-B')).toBe(true);
  });

  it('T043: 过滤掉本地 peer（provider.awareness.clientID）的锁', () => {
    const myClientId = 100;
    const mockProvider = createMockProvider(myClientId) as unknown as Parameters<typeof useBlockLocks>[0]['provider'];

    const { result } = renderHook(() =>
      useBlockLocks({ provider: mockProvider })
    );

    // 设置本地状态（应该被过滤）
    act(() => {
      (mockProvider!.awareness as unknown as ReturnType<typeof createMockProvider>['awareness'])
        .setLocalState({
          lockedBlocks: {
            'my-own-block': { holder: 'me' },
          },
        });
    });

    // 不应该看到自己的 block
    expect(result.current.lockedBlockIds.has('my-own-block')).toBe(false);
    expect(result.current.lockedBlockIds.size).toBe(0);
  });

  it('兜底定时器：expiresAt 过期后自动从 Set 移除', () => {
    const myClientId = 100;
    const remoteClientId = 200;
    const mockProvider = createMockProvider(myClientId) as unknown as Parameters<typeof useBlockLocks>[0]['provider'];

    const { result } = renderHook(() =>
      useBlockLocks({ provider: mockProvider, fallbackIntervalMs: 500 })
    );

    // 远程 peer 锁定一个**已过期**的 block（expired 1 秒前）
    act(() => {
      (mockProvider!.awareness as unknown as ReturnType<typeof createMockProvider>['awareness'])
        .setRemoteState(remoteClientId, {
          lockedBlocks: {
            'block-expired': { holder: 'peer-200', expiresAt: new Date(Date.now() - 1000).toISOString() },
          },
        });
    });

    // awareness 协议不会自动过滤过期锁，但 fallback timer 应当清理
    expect(result.current.lockedBlockIds.size).toBe(1);

    // 推进 fake timer，触发 fallback 定时器
    act(() => {
      vi.advanceTimersByTime(600);
    });

    // 过期锁应被移除
    expect(result.current.lockedBlockIds.has('block-expired')).toBe(false);
  });

  it('provider 为 null 时返回空 Set（不抛错）', () => {
    const { result } = renderHook(() => useBlockLocks({ provider: null }));
    expect(result.current.lockedBlockIds).toBeInstanceOf(Set);
    expect(result.current.lockedBlockIds.size).toBe(0);
    expect(result.current.lockStates.size).toBe(0);
  });

  it('兼容旧版 awareness schema（blockId 映射到 string）', () => {
    const myClientId = 100;
    const remoteClientId = 200;
    const mockProvider = createMockProvider(myClientId) as unknown as Parameters<typeof useBlockLocks>[0]['provider'];

    const { result } = renderHook(() =>
      useBlockLocks({ provider: mockProvider })
    );

    act(() => {
      (mockProvider!.awareness as unknown as ReturnType<typeof createMockProvider>['awareness'])
        .setRemoteState(remoteClientId, {
          lockedBlocks: {
            'legacy-block': 'peer-200', // 旧版：string holder
          },
        });
    });

    expect(result.current.lockedBlockIds.has('legacy-block')).toBe(true);
    expect(result.current.lockStates.get('legacy-block')?.holder).toBe('peer-200');
  });
});
