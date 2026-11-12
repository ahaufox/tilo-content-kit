/**
 * /collab — Yjs 富文本协同基座入口
 *
 * 设计边界：仅上收业务无关的协同逻辑（撤销隔离、成员感知、块级锁），只依赖
 * yjs / y-websocket / @tiptap/y-tiptap 与 React，不耦合宿主 UI、Tailwind 或业务类型。
 *
 * 产品语义（谁是 AI、状态取值、锁字段）由 `CollabAwarenessAdapter` 注入，
 * 包内提供 `tiloAwarenessAdapter` 作为默认值；业务层（Provider 创建、连接状态 UI、
 * 协同会话管理）因强依赖后端地址 / 鉴权 / 宿主路由，仍留在宿主。
 */
export { CONTENT_KIT_VERSION } from '../version';

export {
  AGENT_ORIGIN,
  USER_TABLE_RESIZE_ORIGIN,
  PATCHED_SYMBOL,
  patchYjsOriginSync,
  createIsolatedUndoManagers,
  destroyIsolatedUndoManagers,
  useIsolatedUndoManagers,
  useUndoManagerStatus,
} from './useIsolatedUndoManagers';
export type {
  IsolatedUndoManagers,
  UseIsolatedUndoManagersOptions,
  UndoManagerStatus,
} from './useIsolatedUndoManagers';

export { useBlockLocks } from './useBlockLocks';
export type { UseBlockLocksOptions, UseBlockLocksResult } from './useBlockLocks';

export {
  useCollabMembers,
  computeMembers,
  areMemberListsEqual,
  generateFallbackColor,
  generateFallbackName,
  tiloAwarenessAdapter,
} from './useCollabMembers';
export type { UseCollabMembersOptions } from './useCollabMembers';

export { DEFAULT_STATUS_TIMEOUT_MS } from './adapter/tilo-default';
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
