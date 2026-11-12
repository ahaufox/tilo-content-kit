import { describe, expect, it } from 'vitest';
import type { WebsocketProvider } from 'y-websocket';
import {
  computeMembers,
  tiloAwarenessAdapter,
  type CollabAwarenessAdapter,
} from '../src/collab';

/** 构造最小 awareness 替身：本地 peer = 1，远端 peer = 2 */
function createProvider(states: Record<number, unknown>) {
  const map = new Map<number, unknown>(Object.entries(states).map(([k, v]) => [Number(k), v]));
  const awareness = {
    clientID: 1,
    getStates: () => map,
    on: () => {},
    off: () => {},
  };
  return { awareness } as unknown as WebsocketProvider;
}

describe('CollabAwarenessAdapter — 产品状态机可替换', () => {
  it('默认适配器：AI 成员、状态与块锁按 Tilo 语义解析', () => {
    const provider = createProvider({
      1: { user: { name: '我', type: 'human' } },
      2: {
        user: { name: '助手', type: 'ai' },
        status: { state: 'rewriting', currentBlockId: 'b-1' },
        lockedBlocks: { 'b-1': { holder: '2', expiresAt: '2999-01-01T00:00:00Z' } },
      },
    });

    const result = computeMembers(provider);
    expect(result.members).toHaveLength(1);
    expect(result.aiMembers[0].name).toBe('助手');
    expect(result.aiMembers[0].status.state).toBe('rewriting');
    expect(result.aiMembers[0].isActiveRewriter).toBe(true);
    expect(result.aiMembers[0].heldBlockIds).toEqual(['b-1']);
  });

  it('默认适配器兼容旧版字符串锁格式', () => {
    const provider = createProvider({ 2: { lockedBlocks: { 'b-9': 'peer-2' } } });
    const member = computeMembers(provider).members[0];
    expect(member.heldBlockIds).toEqual(['b-9']);
  });

  it('自定义适配器：完全替换状态取值、AI 判定与锁字段', () => {
    type MyState = 'drafting' | 'reviewing' | 'idle';
    const adapter: CollabAwarenessAdapter<MyState> = {
      statusTimeoutMs: 60_000,
      isAi: (user) => user?.type === 'ai',
      normalizeStatus: (raw) => {
        const status = (raw as { progress?: { phase?: MyState } }).progress;
        return { state: status?.phase ?? 'idle' };
      },
      readLocks: (raw) => {
        const locks = (raw as { locks?: Record<string, string> }).locks ?? {};
        return Object.fromEntries(Object.entries(locks).map(([k, v]) => [k, { holder: v }]));
      },
      isActiveRewriter: (status) => status.state === 'drafting',
    };

    const provider = createProvider({
      2: {
        user: { name: '法律助手', type: 'ai' },
        progress: { phase: 'drafting' },
        locks: { 'block-a': 'peer-2' },
      },
    });

    const result = computeMembers(provider, adapter);
    expect(result.aiMembers).toHaveLength(1);
    expect(result.aiMembers[0].status.state).toBe('drafting');
    expect(result.aiMembers[0].isActiveRewriter).toBe(true);
    expect(result.aiMembers[0].heldBlockIds).toEqual(['block-a']);
    expect(result.activeRewriters).toHaveLength(1);
  });

  it('自定义适配器下状态取值不再受默认枚举约束', () => {
    type MyState = 'waiting' | 'done';
    const adapter: CollabAwarenessAdapter<MyState> = {
      statusTimeoutMs: 1_000,
      isAi: () => false,
      normalizeStatus: () => ({ state: 'done' }),
      readLocks: () => ({}),
    };
    const provider = createProvider({ 2: { user: { name: '甲', type: 'human' } } });
    const result = computeMembers(provider, adapter);
    expect(result.members[0].status.state).toBe('done');
    expect(result.aiMembers).toHaveLength(0);
  });

  it('provider 缺 awareness 时安全降级为空结果', () => {
    const provider = { awareness: undefined } as unknown as WebsocketProvider;
    expect(computeMembers(provider)).toEqual({
      members: [],
      humanMembers: [],
      aiMembers: [],
      activeRewriters: [],
    });
  });

  it('默认适配器导出可直接复用（读取锁字段）', () => {
    expect(tiloAwarenessAdapter.readLocks({ lockedBlocks: { a: { holder: 'x' } } })).toEqual({
      a: { holder: 'x', expiresAt: undefined },
    });
    expect(tiloAwarenessAdapter.statusTimeoutMs).toBe(30_000);
  });
});
