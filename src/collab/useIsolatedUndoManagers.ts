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

import { useMemo, useRef, useEffect, useCallback, useSyncExternalStore } from 'react';
import type { Editor } from '@tiptap/core';
import { ySyncPluginKey } from '@tiptap/y-tiptap';
import * as Y from 'yjs';
import {
  AGENT_ORIGIN,
  PATCHED_SYMBOL,
  USER_TABLE_RESIZE_ORIGIN,
} from '../internal/origins';

export { AGENT_ORIGIN, PATCHED_SYMBOL, USER_TABLE_RESIZE_ORIGIN };

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
export function patchYjsOriginSync(editor: Editor, ydoc: Y.Doc): void {
  if (!editor || !editor.view || !ydoc) return;
  if ((editor as unknown as Record<symbol, boolean>)[PATCHED_SYMBOL]) {
    return;
  }
  (editor as unknown as Record<symbol, boolean>)[PATCHED_SYMBOL] = true;

  const originalTransact = ydoc.transact.bind(ydoc) as (
    f: (transaction: Y.Transaction) => void,
    origin?: unknown,
  ) => void;
  let currentOrigin: string | null = null;

  ydoc.transact = function (
    f: (transaction: Y.Transaction) => void,
    origin?: unknown,
  ): void {
    if (origin === ySyncPluginKey && currentOrigin !== null) {
      originalTransact(f, currentOrigin);
      return;
    }
    originalTransact(f, origin);
  } as typeof ydoc.transact;

  const originalDispatch = editor.view.dispatch.bind(editor.view);
  editor.view.dispatch = (tr) => {
    currentOrigin = tr.getMeta('origin') ?? null;
    originalDispatch(tr);
    currentOrigin = null;
  };
}

export interface IsolatedUndoManagers {
  /** 仅追踪人类用户编辑的撤销管理器 */
  localUndoManager: Y.UndoManager;
  /** 仅追踪 AI 代理编辑的撤销管理器 */
  agentUndoManager: Y.UndoManager;
}

export interface UseIsolatedUndoManagersOptions {
  /** Y.Doc 实例 */
  ydoc: Y.Doc;
  /** 协同字段名，默认 'content' */
  field?: string;
}

export interface UndoManagerStatus {
  /** 本地人类操作是否可撤销 */
  canUndo: boolean;
  /** 本地人类操作是否可重做 */
  canRedo: boolean;
  /** AI 代理操作是否可撤销 */
  canUndoAgent: boolean;
}

const DEFAULT_STATUS: UndoManagerStatus = Object.freeze({
  canUndo: false,
  canRedo: false,
  canUndoAgent: false,
});

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
export function createIsolatedUndoManagers(
  ydoc: Y.Doc,
  field = 'content',
): IsolatedUndoManagers {
  const fragment = ydoc.getXmlFragment(field);

  const localUm = new Y.UndoManager(fragment, {
    trackedOrigins: new Set([ySyncPluginKey, USER_TABLE_RESIZE_ORIGIN]),
  });

  const agentUm = new Y.UndoManager(fragment, {
    trackedOrigins: new Set([AGENT_ORIGIN]),
  });

  return { localUndoManager: localUm, agentUndoManager: agentUm };
}

/**
 * 销毁人机撤销管理器实例，释放底层 Yjs 观察器与内存。
 */
export function destroyIsolatedUndoManagers(
  managers: IsolatedUndoManagers | null | undefined,
): void {
  if (!managers) return;
  managers.localUndoManager.destroy();
  managers.agentUndoManager.destroy();
}

/**
 * 创建隔离的人机撤销管理器（React Hook 版本）。
 * 当 Y.Doc 在组件顶层已可用时使用此 Hook。
 */
export function useIsolatedUndoManagers({
  ydoc,
  field = 'content',
}: UseIsolatedUndoManagersOptions): IsolatedUndoManagers {
  return useMemo(
    () => createIsolatedUndoManagers(ydoc, field),
    [ydoc, field],
  );
}

/**
 * 订阅撤销管理器的栈状态变化。
 * 基于 React useSyncExternalStore 实现并发安全的外部状态订阅，返回响应式状态。
 * 在组件卸载或 managers 变更时，自动通过 .off() 完整解绑事件监听，杜绝内存泄漏。
 */
export function useUndoManagerStatus(
  managers: IsolatedUndoManagers | null,
  onStatusChange?: (status: UndoManagerStatus) => void,
): UndoManagerStatus {
  const onStatusChangeRef = useRef(onStatusChange);
  useEffect(() => {
    onStatusChangeRef.current = onStatusChange;
  }, [onStatusChange]);

  const lastSnapshotRef = useRef<UndoManagerStatus>(DEFAULT_STATUS);

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (!managers) return () => {};
      const { localUndoManager, agentUndoManager } = managers;

      const handler = () => {
        onStoreChange();
      };

      localUndoManager.on('stack-item-added', handler);
      localUndoManager.on('stack-item-popped', handler);
      agentUndoManager.on('stack-item-added', handler);
      agentUndoManager.on('stack-item-popped', handler);

      return () => {
        localUndoManager.off('stack-item-added', handler);
        localUndoManager.off('stack-item-popped', handler);
        agentUndoManager.off('stack-item-added', handler);
        agentUndoManager.off('stack-item-popped', handler);
      };
    },
    [managers],
  );

  const getSnapshot = useCallback((): UndoManagerStatus => {
    if (!managers) {
      return DEFAULT_STATUS;
    }

    const { localUndoManager, agentUndoManager } = managers;
    const canUndo = localUndoManager.undoStack.length > 0;
    const canRedo = localUndoManager.redoStack.length > 0;
    const canUndoAgent = agentUndoManager.undoStack.length > 0;

    const prev = lastSnapshotRef.current;
    if (
      prev.canUndo === canUndo &&
      prev.canRedo === canRedo &&
      prev.canUndoAgent === canUndoAgent
    ) {
      return prev;
    }

    const next: UndoManagerStatus = { canUndo, canRedo, canUndoAgent };
    lastSnapshotRef.current = next;
    return next;
  }, [managers]);

  const status = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    onStatusChangeRef.current?.(status);
  }, [status]);

  return status;
}
