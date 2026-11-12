/**
 * collab/adapter/types — 协同 awareness 的公共形态与适配器接口
 *
 * 设计原则：SDK 只定义"结构"（成员、状态、锁）与订阅机制，**不定义状态取值**。
 * 产品状态机（例如 Tilo 的 thinking / rewriting / reviewing）由适配器注入：
 * 包内提供 `tiloAwarenessAdapter` 作为默认值，宿主可用 `useCollabMembers<MyState>`
 * 换成自己的状态集，而无需修改 SDK。
 */

/** Tilo 产品默认状态集（仅作为默认适配器的取值，不是 SDK 的类型约束） */
export type CollabStatus = 'idle' | 'thinking' | 'rewriting' | 'reviewing';

/** 成员状态；`TState` 允许调用方扩展自己的状态取值 */
export interface MemberStatus<TState extends string = CollabStatus> {
  state: TState;
  currentBlockId?: string;
  updatedAt?: string;
  message?: string;
}

/** awareness 中的用户信息 */
export interface AwarenessUser {
  name: string;
  color?: string;
  type: 'human' | 'ai';
  avatar?: string;
}

/** 兼容历史 schema：awareness.status 的固定三态写法（默认适配器使用） */
export interface AwarenessStatus {
  state: CollabStatus;
  currentBlockId?: string;
  updatedAt?: string;
  message?: string;
}

/** 兼容历史 schema：awareness state 的形状（默认适配器使用） */
export interface AwarenessState {
  user?: AwarenessUser;
  status?: AwarenessStatus;
  lockedBlocks?: Record<string, { holder: string; expiresAt: string }>;
}

/** 块级锁的持有信息 */
export interface BlockLockAwareness {
  /** 持有者 clientId（来自 awareness.clientID） */
  holder: string;
  /** 锁过期时间 ISO8601（可选，用于前端兜底定时器） */
  expiresAt?: string;
}

/** 协同成员（视图模型） */
export interface CollabMember<TState extends string = CollabStatus> {
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

export interface UseCollabMembersResult<TState extends string = CollabStatus> {
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
export interface CollabAwarenessAdapter<TState extends string = CollabStatus> {
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
