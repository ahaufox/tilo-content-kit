/**
 * useCollabMembers — 协同成员状态 Hook 单元测试
 *
 * 测试目标：验证 awareness 协议的成员状态解析、本地 peer 过滤、fallback 机制
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCollabMembers, areMemberListsEqual } from '../src/collab';
import type { WebsocketProvider } from 'y-websocket';

/** 构建一个模拟的 awareness 对象 */
function createMockAwareness(initialStates: Map<number, unknown>) {
  const listeners = new Map<string, Set<(...args: unknown[]) => void>>();

  return {
    clientID: 1, // 默认本地 peer 为 1
    getStates: vi.fn(() => initialStates),
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)!.add(handler);
    }),
    off: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      listeners.get(event)?.delete(handler);
    }),
    // 用于测试触发 change 事件
    _listeners: listeners,
    _trigger(event: string, ...args: unknown[]) {
      listeners.get(event)?.forEach(h => h(...args));
    },
  };
}

/** 构建一个模拟的 WebsocketProvider */
function createMockProvider(awareness: ReturnType<typeof createMockAwareness>): WebsocketProvider {
  return {
    awareness: awareness as unknown as WebsocketProvider['awareness'],
  } as unknown as WebsocketProvider;
}

describe('useCollabMembers', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('test_awareness_change_updates_members', () => {
    const states = new Map<number, unknown>([
      [2, {
        user: { name: 'Alice', color: '#ff0000', type: 'human' },
        status: { state: 'idle' },
      }],
    ]);
    const awareness = createMockAwareness(states);
    const provider = createMockProvider(awareness);

    const { result } = renderHook(() => useCollabMembers(provider));

    // 初始应包含 Alice
    expect(result.current.members).toHaveLength(1);
    expect(result.current.members[0].name).toBe('Alice');
    expect(result.current.members[0].color).toBe('#ff0000');

    // 触发 change 事件：添加 Bob
    act(() => {
      awareness.getStates.mockReturnValue(new Map([
        [2, {
          user: { name: 'Alice', color: '#ff0000', type: 'human' },
          status: { state: 'idle' },
        }],
        [3, {
          user: { name: 'Bob', color: '#00ff00', type: 'human' },
          status: { state: 'thinking' },
        }],
      ]));
      awareness._trigger('change');
      vi.advanceTimersByTime(100); // debounce
    });

    expect(result.current.members).toHaveLength(2);
    expect(result.current.members.map(m => m.name).sort()).toEqual(['Alice', 'Bob']);
  });

  it('test_filters_local_peer_from_visible_list', () => {
    // 本地 peer 的 clientID 为 1
    const states = new Map<number, unknown>([
      [1, {
        user: { name: 'LocalUser', color: '#000000', type: 'human' },
        status: { state: 'idle' },
      }],
      [2, {
        user: { name: 'RemoteUser', color: '#ff0000', type: 'human' },
        status: { state: 'idle' },
      }],
    ]);
    const awareness = createMockAwareness(states);
    const provider = createMockProvider(awareness);

    const { result } = renderHook(() => useCollabMembers(provider));

    // 本地 peer (clientID=1) 不应出现在列表中
    expect(result.current.members).toHaveLength(1);
    expect(result.current.members[0].name).toBe('RemoteUser');
  });

  it('test_fallback_name_when_user_missing', () => {
    // peer 没有 user 字段
    const states = new Map<number, unknown>([
      [2, {}], // 空状态，无 user 字段
    ]);
    const awareness = createMockAwareness(states);
    const provider = createMockProvider(awareness);

    const { result } = renderHook(() => useCollabMembers(provider));

    expect(result.current.members).toHaveLength(1);
    // fallback: User{clientId % 100} => User2
    expect(result.current.members[0].name).toBe('User2');
  });

  it('test_fallback_color_golden_ratio', () => {
    // peer 有 user 但没有 color 字段
    const states = new Map<number, unknown>([
      [2, {
        user: { name: 'Charlie', type: 'human' },
        status: { state: 'idle' },
      }],
    ]);
    const awareness = createMockAwareness(states);
    const provider = createMockProvider(awareness);

    const { result } = renderHook(() => useCollabMembers(provider));

    expect(result.current.members).toHaveLength(1);
    // 使用 golden ratio hash: (2 * 2654435761) >>> 0 = 5308871522 >>> 0 = 1013905762
    const expectedHash = (2 * 2654435761) >>> 0;
    const r = (expectedHash >> 16) & 0xff;
    const g = (expectedHash >> 8) & 0xff;
    const b = expectedHash & 0xff;
    const expectedColor = `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
    expect(result.current.members[0].color).toBe(expectedColor);
  });

  // ── UD2: AI 专属测试用例 ────────────────────────────────────────────────────

  it('test_ai_peer_parsed_with_type_ai', () => {
    // AI peer 的 awareness state 含 user.type="ai"
    const states = new Map<number, unknown>([
      [2, {
        user: { name: 'AI 改写助手', color: '#8b5cf6', type: 'ai', avatar: '✦' },
        status: { state: 'rewriting', currentBlockId: 'block-001', updatedAt: new Date().toISOString() },
      }],
    ]);
    const awareness = createMockAwareness(states);
    const provider = createMockProvider(awareness);

    const { result } = renderHook(() => useCollabMembers(provider));

    expect(result.current.members).toHaveLength(1);
    const aiMember = result.current.members[0];
    expect(aiMember.type).toBe('ai');
    expect(aiMember.name).toBe('AI 改写助手');
    expect(aiMember.color).toBe('#8b5cf6');
    expect(aiMember.avatar).toBe('✦');
    expect(aiMember.status.state).toBe('rewriting');
    expect(aiMember.isActiveRewriter).toBe(true);

    // AI 成员应出现在 aiMembers 列表中
    expect(result.current.aiMembers).toHaveLength(1);
    expect(result.current.humanMembers).toHaveLength(0);
    expect(result.current.activeRewriters).toHaveLength(1);
  });

  it('test_ai_status_timeout_degrades_to_idle', () => {
    // status.updatedAt 超过 30s 后降级为 idle
    const oldTime = new Date(Date.now() - 60 * 1000).toISOString(); // 60s 前
    const states = new Map<number, unknown>([
      [2, {
        user: { name: 'AI 改写助手', color: '#8b5cf6', type: 'ai', avatar: '✦' },
        status: { state: 'rewriting', currentBlockId: 'block-001', updatedAt: oldTime },
      }],
    ]);
    const awareness = createMockAwareness(states);
    const provider = createMockProvider(awareness);

    const { result } = renderHook(() => useCollabMembers(provider));

    expect(result.current.members).toHaveLength(1);
    // status 超时后应降级为 idle，isActiveRewriter 应为 false
    expect(result.current.members[0].status.state).toBe('idle');
    expect(result.current.members[0].isActiveRewriter).toBe(false);
    expect(result.current.activeRewriters).toHaveLength(0);
  });

  it('test_active_inspection_timer_degrades_ai_without_awareness_events', () => {
    // 初始设置 AI 为 thinking，时间为当前
    const now = Date.now();
    const states = new Map<number, unknown>([
      [2, {
        user: { name: 'AI 改写助手', color: '#8b5cf6', type: 'ai', avatar: '✦' },
        status: { state: 'thinking', currentBlockId: 'block-001', updatedAt: new Date(now).toISOString() },
      }],
    ]);
    const awareness = createMockAwareness(states);
    const provider = createMockProvider(awareness);

    const { result } = renderHook(() => useCollabMembers(provider));

    expect(result.current.members[0].status.state).toBe('thinking');

    // 推进时间 35s（超过 30s 阈值），不触发任何 awareness change 事件
    act(() => {
      vi.advanceTimersByTime(35_000);
    });

    // 5s 周期主动巡检定时器应自动将其状态刷新为 idle
    expect(result.current.members[0].status.state).toBe('idle');
    expect(result.current.activeRewriters).toHaveLength(0);
  });

  it('test_are_member_lists_equal_logic', () => {
    const memberA = {
      clientId: 2,
      name: 'Alice',
      color: '#ff0000',
      type: 'human' as const,
      status: { state: 'idle' as const },
      heldBlockIds: ['b1'],
      isActiveRewriter: false,
      lastSeen: 1000,
    };
    const memberB = {
      ...memberA,
      lastSeen: 2000, // 仅 lastSeen 变化，业务属性一致
    };

    expect(areMemberListsEqual([memberA], [memberB])).toBe(true);

    const memberC = {
      ...memberA,
      status: { state: 'rewriting' as const },
    };
    expect(areMemberListsEqual([memberA], [memberC])).toBe(false);
  });
});