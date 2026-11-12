# API 快照：@tilo-ui/content-kit/collab

> 自动生成，请勿手改。刷新：`pnpm api:update`。校验：`pnpm api:check`。

<!-- 类型摘要 sha256:b310f512aeb4dbbe -->

## 运行时导出符号

- `AGENT_ORIGIN`
- `CONTENT_KIT_VERSION`
- `DEFAULT_STATUS_TIMEOUT_MS`
- `PATCHED_SYMBOL`
- `USER_TABLE_RESIZE_ORIGIN`
- `areMemberListsEqual`
- `computeMembers`
- `createIsolatedUndoManagers`
- `destroyIsolatedUndoManagers`
- `generateFallbackColor`
- `generateFallbackName`
- `patchYjsOriginSync`
- `tiloAwarenessAdapter`
- `useBlockLocks`
- `useCollabMembers`
- `useIsolatedUndoManagers`
- `useUndoManagerStatus`

## 类型声明（归一化，含本地共享 chunk）

```ts
export { C as CONTENT_KIT_VERSION } from './version.js';
import { Editor } from '@tiptap/core';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
export { A as AGENT_ORIGIN, P as PATCHED_SYMBOL, U as USER_TABLE_RESIZE_ORIGIN } from './origins.js';

/**
 * tilo-content-kit/src/collab/useIsolatedUndoManagers.ts
 *
 * 隔离的人机撤销管理器 Hook（原 frontend-v2/src/lib/yjs/useIsolatedUndoManagers.ts）
 *
 * 职责：基于 Yjs UndoManager 创建两个独立的撤销栈：
 *   - localUndoManager：仅追踪人类用户的本地编辑事务（origin 为 null/undefined），忽略 AI 代理（origin === 'agent'）的修改
 *   - agentUndoManager：仅追踪 AI 代理的编辑事务（origin === 'agent'），忽略人类用户的修改
 * 对外暴露撤销/重做能力及栈状态，支持快捷键拦截与工具栏按钮集成。
 *
 * 上收说明（@tilo-ui/content-kit 0.5.0）：单一事实源已上收至 SDK /collab，
 * 原宿主 @/lib/yjs 改为 re-export 桥。事务来源常量统一由 src/internal/origins
 * 定义（与 /tiptap 的 ResizableTable 共用同一份），本文件仅 re-export。
 */

/**
 * 修补 Yjs transaction origin，使 ProseMirror transaction 上的 `origin` meta
 * 能够透传到 Yjs 层，从而让人类编辑 / 表格列宽调整 / AI 改写分别进入不同的
 * UndoManager 撤销栈。
 *
 * 背景：@tiptap/y-tiptap 在同步 ProseMirror 变更到 Y.Doc 时，统一使用
 * `ydoc.transact(fn, ySyncPluginKey)` 作为 origin，导致无法通过 Yjs UndoManager
 * 的 trackedOrigins 区分用户编辑与 AI 改写。本函数在 editor.view.dispatch 期间
 * 捕获 tr.getMeta('origin')，并在 y-tiptap 发起同步时临时替换为对应 origin。
 *
 * 防重入：挂载 PATCHED_SYMBOL 幂等锁，多次调用安全跳过。
 */
declare function patchYjsOriginSync(editor: Editor, ydoc: Y.Doc): void;
interface IsolatedUndoManagers {
    /** 仅追踪人类用户编辑的撤销管理器 */
    localUndoManager: Y.UndoManager;
    /** 仅追踪 AI 代理编辑的撤销管理器 */
    agentUndoManager: Y.UndoManager;
}
interface UseIsolatedUndoManagersOptions {
    /** Y.Doc 实例 */
    ydoc: Y.Doc;
    /** 协同字段名，默认 'content' */
    field?: string;
}
interface UndoManagerStatus {
    /** 本地人类操作是否可撤销 */
    canUndo: boolean;
    /** 本地人类操作是否可重做 */
    canRedo: boolean;
    /** AI 代理操作是否可撤销 */
    canUndoAgent: boolean;
}
/**
 * 创建隔离的人机撤销管理器（纯函数，非 Hook）。
 * 可直接在 useEffect 等非组件顶层调用。
 *
 * 原理：在同一个 XmlFragment 上创建两个 UndoManager，
 * 通过 trackedOrigins 选项分别过滤事务来源，
 * 实现人类编辑与 AI 代理编辑的撤销隔离。
 *
 * - localUndoManager: trackedOrigins 包含 ySyncPluginKey（普通人类用户编辑）
 *   与 'user-table-resize'（手动调整表格列宽）
 * - agentUndoManager: trackedOrigins 只包含 'agent'
 */
declare function createIsolatedUndoManagers(ydoc: Y.Doc, field?: string): IsolatedUndoManagers;
/**
 * 销毁人机撤销管理器实例，释放底层 Yjs 观察器与内存。
 */
declare function destroyIsolatedUndoManagers(managers: IsolatedUndoManagers | null | undefined): void;
/**
 * 创建隔离的人机撤销管理器（React Hook 版本）。
 * 当 Y.Doc 在组件顶层已可用时使用此 Hook。
 */
declare function useIsolatedUndoManagers({ ydoc, field, }: UseIsolatedUndoManagersOptions): IsolatedUndoManagers;
/**
 * 订阅撤销管理器的栈状态变化。
 * 基于 React useSyncExternalStore 实现并发安全的外部状态订阅，返回响应式状态。
 * 在组件卸载或 managers 变更时，自动通过 .off() 完整解绑事件监听，杜绝内存泄漏。
 */
declare function useUndoManagerStatus(managers: IsolatedUndoManagers | null, onStatusChange?: (status: UndoManagerStatus) => void): UndoManagerStatus;

/**
 * collab/adapter/types — 协同 awareness 的公共形态与适配器接口
 *
 * 设计原则：SDK 只定义"结构"（成员、状态、锁）与订阅机制，**不定义状态取值**。
 * 产品状态机（例如 Tilo 的 thinking / rewriting / reviewing）由适配器注入：
 * 包内提供 `tiloAwarenessAdapter` 作为默认值，宿主可用 `useCollabMembers<MyState>`
 * 换成自己的状态集，而无需修改 SDK。
 */
/** Tilo 产品默认状态集（仅作为默认适配器的取值，不是 SDK 的类型约束） */
type CollabStatus = 'idle' | 'thinking' | 'rewriting' | 'reviewing';
/** 成员状态；`TState` 允许调用方扩展自己的状态取值 */
interface MemberStatus<TState extends string = CollabStatus> {
    state: TState;
    currentBlockId?: string;
    updatedAt?: string;
    message?: string;
}
/** awareness 中的用户信息 */
interface AwarenessUser {
    name: string;
    color?: string;
    type: 'human' | 'ai';
    avatar?: string;
}
/** 兼容历史 schema：awareness.status 的固定三态写法（默认适配器使用） */
interface AwarenessStatus {
    state: CollabStatus;
    currentBlockId?: string;
    updatedAt?: string;
    message?: string;
}
/** 兼容历史 schema：awareness state 的形状（默认适配器使用） */
interface AwarenessState {
    user?: AwarenessUser;
    status?: AwarenessStatus;
    lockedBlocks?: Record<string, {
        holder: string;
        expiresAt: string;
    }>;
}
/** 块级锁的持有信息 */
interface BlockLockAwareness {
    /** 持有者 clientId（来自 awareness.clientID） */
    holder: string;
    /** 锁过期时间 ISO8601（可选，用于前端兜底定时器） */
    expiresAt?: string;
}
/** 协同成员（视图模型） */
interface CollabMember<TState extends string = CollabStatus> {
    clientId: number;
    name: string;
    /** hex color */
    color: string;
    type: 'human' | 'ai';
    avatar?: string;
    status: MemberStatus<TState>;
    heldBlockIds: string[];
    /** status.state === 'rewriting'（默认实现；可由适配器覆盖） */
    isActiveRewriter: boolean;
    /** awareness 状态最后一次被观测到的时间（Date.now()） */
    lastSeen: number;
}
interface UseCollabMembersResult<TState extends string = CollabStatus> {
    /** 所有可见成员（已过滤本地 peer） */
    members: CollabMember<TState>[];
    /** 仅人类成员 */
    humanMembers: CollabMember<TState>[];
    /** 仅 AI 成员 */
    aiMembers: CollabMember<TState>[];
    /** 当前正在改写的成员 */
    activeRewriters: CollabMember<TState>[];
}
/**
 * awareness 适配器：把"产品语义"从 SDK 实现中剥离的唯一入口。
 *
 * 四个方法对应 awareness 协议的四个假设：
 *   1. 谁是 AI；2. 状态如何归一化与超时降级；3. 块级锁字段如何解析；4. 何为"正在改写"。
 */
interface CollabAwarenessAdapter<TState extends string = CollabStatus> {
    /** 判定某成员是否为 AI 代理 */
    isAi(user: AwarenessUser | undefined): boolean;
    /** 归一化状态（入参为单个 peer 的完整 awareness state） */
    normalizeStatus(rawState: unknown): MemberStatus<TState>;
    /** 读取块级锁（入参为单个 peer 的完整 awareness state） */
    readLocks(rawState: unknown): Record<string, BlockLockAwareness>;
    /** 状态超时降级阈值（毫秒） */
    statusTimeoutMs: number;
    /** 判定是否"正在改写"，默认 state === 'rewriting' */
    isActiveRewriter?(status: MemberStatus<TState>): boolean;
}

interface UseBlockLocksOptions<TState extends string = CollabStatus> {
    /** WebsocketProvider 实例，可为 null（房间未就绪时） */
    provider: WebsocketProvider | null;
    /** 本地 clientId；不传时自动取 provider.awareness.clientID */
    localClientId?: number;
    /** 兜底定时器间隔（毫秒），默认 1000ms */
    fallbackIntervalMs?: number;
    /** 产品语义适配器（决定锁字段如何解析），默认 tiloAwarenessAdapter */
    adapter?: CollabAwarenessAdapter<TState>;
}
interface UseBlockLocksResult {
    /** 当前活跃的锁定 blockId 集合（来自所有非本地 peer） */
    lockedBlockIds: Set<string>;
    /** 完整的 awareness 状态（含 holder / expiresAt），key 为 blockId */
    lockStates: Map<string, BlockLockAwareness>;
}
declare function useBlockLocks<TState extends string = CollabStatus>({ provider, localClientId, fallbackIntervalMs, adapter, }: UseBlockLocksOptions<TState>): UseBlockLocksResult;

/**
 * collab/adapter/tilo-default — Tilo 默认 awareness 适配器
 *
 * 语义与 0.5.0 完全一致（thinking / rewriting / reviewing、30s 超时降级、
 * 块级锁兼容 string 与 {holder, expiresAt} 两种历史格式），因此宿主无需改动。
 * 需要不同产品状态机时，自行实现 `CollabAwarenessAdapter` 并传入 Hook。
 */

/** 默认状态超时阈值（ms），超过后降级为 idle */
declare const DEFAULT_STATUS_TIMEOUT_MS = 30000;
/**
 * Tilo 默认适配器。
 *
 * - AI 判定：`user.type === 'ai'`
 * - 状态归一化：缺省 idle；`updatedAt` 超过 `statusTimeoutMs` 且非 idle 时降级 idle
 * - 块级锁：兼容 `{ holder, expiresAt }` 与 `holder` 字符串
 * - 正在改写：`state === 'rewriting'`
 */
declare const tiloAwarenessAdapter: CollabAwarenessAdapter;
/** 生成 fallback 颜色：按 clientId 哈希取 RGB（黄金比例近似） */
declare function generateFallbackColor(clientId: number): string;
/** 生成 fallback 名称：'User' + clientId % 100 */
declare function generateFallbackName(clientId: number): string;

/**
 * 比较新旧成员列表的关键业务属性，判断是否发生实质变更。
 */
declare function areMemberListsEqual<TState extends string = CollabStatus>(prev: CollabMember<TState>[], next: CollabMember<TState>[]): boolean;
/**
 * 从 provider 的 awareness 计算成员列表（纯函数，无副作用）。
 */
declare function computeMembers<TState extends string = CollabStatus>(provider: WebsocketProvider | null, adapter?: CollabAwarenessAdapter<TState>): UseCollabMembersResult<TState>;
interface UseCollabMembersOptions<TState extends string = CollabStatus> {
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
declare function useCollabMembers<TState extends string = CollabStatus>(provider: WebsocketProvider | null, options?: UseCollabMembersOptions<TState>): UseCollabMembersResult<TState>;

export { type AwarenessState, type AwarenessStatus, type AwarenessUser, type BlockLockAwareness, type CollabAwarenessAdapter, type CollabMember, type CollabStatus, DEFAULT_STATUS_TIMEOUT_MS, type IsolatedUndoManagers, type MemberStatus, type UndoManagerStatus, type UseBlockLocksOptions, type UseBlockLocksResult, type UseCollabMembersOptions, type UseCollabMembersResult, type UseIsolatedUndoManagersOptions, areMemberListsEqual, computeMembers, createIsolatedUndoManagers, destroyIsolatedUndoManagers, generateFallbackColor, generateFallbackName, patchYjsOriginSync, tiloAwarenessAdapter, useBlockLocks, useCollabMembers, useIsolatedUndoManagers, useUndoManagerStatus };
```
