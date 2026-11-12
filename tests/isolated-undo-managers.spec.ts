/**
 * useIsolatedUndoManagers — 隔离的人机撤销管理器单元测试
 * 
 * 测试目标：验证人类编辑与 AI 代理编辑的撤销隔离机制
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { Editor } from '@tiptap/core';
import { ySyncPluginKey } from '@tiptap/y-tiptap';
import * as Y from 'yjs';
import {
  useUndoManagerStatus,
  destroyIsolatedUndoManagers,
  patchYjsOriginSync,
  PATCHED_SYMBOL,
  createIsolatedUndoManagers as prodCreateIsolatedUndoManagers,
} from '../src/collab';

/** 标记 AI 代理编辑的事务来源标识 */
const AGENT_ORIGIN = 'agent';

function createIsolatedUndoManagers(doc: Y.Doc, field = 'content') {
  const fragment = doc.getXmlFragment(field);

  const localUm = new Y.UndoManager(fragment, {
    trackedOrigins: new Set([null]),
    captureTimeout: 0,
  });

  const agentUm = new Y.UndoManager(fragment, {
    trackedOrigins: new Set([AGENT_ORIGIN]),
    captureTimeout: 0,
  });

  return { localUndoManager: localUm, agentUndoManager: agentUm };
}

/** 辅助函数：在 Y.Doc 中插入文本段落 */
function insertParagraph(doc: Y.Doc, text: string, origin?: string) {
  const fragment = doc.getXmlFragment('content');
  doc.transact(() => {
    const p = new Y.XmlElement('paragraph');
    const txt = new Y.XmlText();
    txt.insert(0, text);
    p.insert(0, [txt]);
    fragment.insert(fragment.length, [p]);
  }, origin);
}

/** 辅助函数：获取文档所有段落的纯文本 */
function getDocumentText(doc: Y.Doc): string[] {
  const fragment = doc.getXmlFragment('content');
  const texts: string[] = [];
  for (let i = 0; i < fragment.length; i++) {
    const el = fragment.get(i) as Y.XmlElement;
    if (el && el.nodeName === 'paragraph') {
      const textNode = el.firstChild as Y.XmlText | null;
      if (textNode) {
        texts.push(textNode.toString());
      }
    }
  }
  return texts;
}

describe('隔离撤销管理器', () => {
  let doc: Y.Doc;

  beforeEach(() => {
    doc = new Y.Doc();
  });

  describe('人类编辑隔离', () => {
    it('人类编辑应进入 localUndoManager 的撤销栈', () => {
      const { localUndoManager } = createIsolatedUndoManagers(doc);

      insertParagraph(doc, '人类输入的内容');

      expect(localUndoManager.undoStack.length).toBe(1);
    });

    it('撤销人类编辑后文档应恢复', () => {
      const { localUndoManager } = createIsolatedUndoManagers(doc);

      insertParagraph(doc, '人类输入的内容');
      expect(getDocumentText(doc)).toEqual(['人类输入的内容']);

      localUndoManager.undo();
      expect(getDocumentText(doc)).toEqual([]);
    });

    it('多次人类编辑应全部进入 localUndoManager 栈', () => {
      const { localUndoManager } = createIsolatedUndoManagers(doc);

      insertParagraph(doc, '第一段');
      insertParagraph(doc, '第二段');
      insertParagraph(doc, '第三段');

      expect(localUndoManager.undoStack.length).toBe(3);
    });

    it('撤销后重做人类编辑应恢复内容', () => {
      const { localUndoManager } = createIsolatedUndoManagers(doc);

      insertParagraph(doc, '人类输入的内容');
      localUndoManager.undo();
      expect(getDocumentText(doc)).toEqual([]);

      localUndoManager.redo();
      expect(getDocumentText(doc)).toEqual(['人类输入的内容']);
    });
  });

  describe('AI 代理编辑隔离', () => {
    it('AI 代理编辑应进入 agentUndoManager 的撤销栈', () => {
      const { agentUndoManager } = createIsolatedUndoManagers(doc);

      insertParagraph(doc, 'AI 改写的内容', AGENT_ORIGIN);

      expect(agentUndoManager.undoStack.length).toBe(1);
    });

    it('撤销 AI 代理编辑后文档应恢复', () => {
      const { agentUndoManager } = createIsolatedUndoManagers(doc);

      insertParagraph(doc, 'AI 改写的内容', AGENT_ORIGIN);
      expect(getDocumentText(doc)).toEqual(['AI 改写的内容']);

      agentUndoManager.undo();
      expect(getDocumentText(doc)).toEqual([]);
    });

    it('多次 AI 代理编辑应全部进入 agentUndoManager 栈', () => {
      const { agentUndoManager } = createIsolatedUndoManagers(doc);

      insertParagraph(doc, 'AI 第一段', AGENT_ORIGIN);
      insertParagraph(doc, 'AI 第二段', AGENT_ORIGIN);

      expect(agentUndoManager.undoStack.length).toBe(2);
    });
  });

  describe('人机混合编辑隔离', () => {
    it('人类编辑不应进入 agentUndoManager 栈', () => {
      const { agentUndoManager } = createIsolatedUndoManagers(doc);

      insertParagraph(doc, '人类输入的内容');

      expect(agentUndoManager.undoStack.length).toBe(0);
    });

    it('AI 代理编辑不应进入 localUndoManager 栈', () => {
      const { localUndoManager } = createIsolatedUndoManagers(doc);

      insertParagraph(doc, 'AI 改写的内容', AGENT_ORIGIN);

      expect(localUndoManager.undoStack.length).toBe(0);
    });

    it('人机混合编辑：撤销人类编辑不影响 AI 内容', () => {
      const { localUndoManager } = createIsolatedUndoManagers(doc);

      insertParagraph(doc, 'AI 改写的内容', AGENT_ORIGIN);
      insertParagraph(doc, '人类补充的内容');

      expect(getDocumentText(doc)).toEqual(['AI 改写的内容', '人类补充的内容']);

      // 撤销人类编辑
      localUndoManager.undo();

      // AI 内容应保留，人类内容应被撤销
      expect(getDocumentText(doc)).toEqual(['AI 改写的内容']);
    });

    it('人机混合编辑：撤销 AI 编辑不影响人类内容', () => {
      const { agentUndoManager } = createIsolatedUndoManagers(doc);

      insertParagraph(doc, '人类输入的内容');
      insertParagraph(doc, 'AI 改写的内容', AGENT_ORIGIN);

      expect(getDocumentText(doc)).toEqual(['人类输入的内容', 'AI 改写的内容']);

      // 撤销 AI 编辑
      agentUndoManager.undo();

      // 人类内容应保留，AI 内容应被撤销
      expect(getDocumentText(doc)).toEqual(['人类输入的内容']);
    });

    it('人机穿插编辑：分别撤销互不影响', () => {
      const { localUndoManager, agentUndoManager } = createIsolatedUndoManagers(doc);

      insertParagraph(doc, '人类段落一');
      insertParagraph(doc, 'AI 段落一', AGENT_ORIGIN);
      insertParagraph(doc, '人类段落二');
      insertParagraph(doc, 'AI 段落二', AGENT_ORIGIN);

      expect(getDocumentText(doc)).toEqual([
        '人类段落一', 'AI 段落一', '人类段落二', 'AI 段落二',
      ]);

      // 撤销最后的人类编辑
      localUndoManager.undo();
      expect(getDocumentText(doc)).toEqual([
        '人类段落一', 'AI 段落一', 'AI 段落二',
      ]);

      // 撤销最后的 AI 编辑
      agentUndoManager.undo();
      expect(getDocumentText(doc)).toEqual([
        '人类段落一', 'AI 段落一',
      ]);

      // 再撤销一次人类编辑
      localUndoManager.undo();
      expect(getDocumentText(doc)).toEqual([
        'AI 段落一',
      ]);
    });

    it('AI 编辑后再撤销 AI 编辑，人类编辑内容不变', () => {
      const { localUndoManager, agentUndoManager } = createIsolatedUndoManagers(doc);

      insertParagraph(doc, '人类原始内容');
      insertParagraph(doc, 'AI 改写内容', AGENT_ORIGIN);

      agentUndoManager.undo();

      // 人机各自栈不受影响
      expect(getDocumentText(doc)).toEqual(['人类原始内容']);
      expect(localUndoManager.undoStack.length).toBe(1);
      expect(agentUndoManager.undoStack.length).toBe(0);
    });
  });

  describe('无来源标记的编辑', () => {
    it('无 origin 的事务应被视为人类编辑', () => {
      const { localUndoManager, agentUndoManager } = createIsolatedUndoManagers(doc);

      // 不带 origin 的编辑
      doc.transact(() => {
        const fragment = doc.getXmlFragment('content');
        const p = new Y.XmlElement('paragraph');
        const txt = new Y.XmlText();
        txt.insert(0, '默认编辑');
        p.insert(0, [txt]);
        fragment.insert(0, [p]);
      });

      expect(localUndoManager.undoStack.length).toBe(1);
      expect(agentUndoManager.undoStack.length).toBe(0);
    });
  });

  describe('useUndoManagerStatus 响应式与生命周期', () => {
    it('managers 为 null 时应返回全部 false', () => {
      const { result } = renderHook(() => useUndoManagerStatus(null));
      expect(result.current).toEqual({
        canUndo: false,
        canRedo: false,
        canUndoAgent: false,
      });
    });

    it('当本地或 AI 发生编辑时响应式更新状态', () => {
      const managers = prodCreateIsolatedUndoManagers(doc);
      const onStatusChange = vi.fn();

      const { result } = renderHook(() =>
        useUndoManagerStatus(managers, onStatusChange)
      );

      expect(result.current.canUndo).toBe(false);
      expect(result.current.canUndoAgent).toBe(false);

      // 人类编辑
      act(() => {
        doc.transact(() => {
          doc.getXmlFragment('content').insert(0, [new Y.XmlText('人类文本')]);
        }, ySyncPluginKey);
      });

      expect(result.current.canUndo).toBe(true);
      expect(onStatusChange).toHaveBeenCalled();

      // AI 编辑
      act(() => {
        doc.transact(() => {
          doc.getXmlFragment('content').insert(0, [new Y.XmlText('AI文本')]);
        }, AGENT_ORIGIN);
      });

      expect(result.current.canUndoAgent).toBe(true);

      // 撤销人类编辑
      act(() => {
        managers.localUndoManager.undo();
      });

      expect(result.current.canRedo).toBe(true);
    });

    it('组件卸载时正确解绑监听器', () => {
      const managers = prodCreateIsolatedUndoManagers(doc);
      const offSpy = vi.spyOn(managers.localUndoManager, 'off');

      const { unmount } = renderHook(() => useUndoManagerStatus(managers));
      unmount();

      expect(offSpy).toHaveBeenCalledWith('stack-item-added', expect.any(Function));
      expect(offSpy).toHaveBeenCalledWith('stack-item-popped', expect.any(Function));
    });
  });

  describe('destroyIsolatedUndoManagers 销毁', () => {
    it('应调用各 UndoManager 的 destroy 方法', () => {
      const managers = prodCreateIsolatedUndoManagers(doc);
      const localDestroySpy = vi.spyOn(managers.localUndoManager, 'destroy');
      const agentDestroySpy = vi.spyOn(managers.agentUndoManager, 'destroy');

      destroyIsolatedUndoManagers(managers);

      expect(localDestroySpy).toHaveBeenCalled();
      expect(agentDestroySpy).toHaveBeenCalled();
    });

    it('传入 null 或 undefined 时安全跳过不报错', () => {
      expect(() => destroyIsolatedUndoManagers(null)).not.toThrow();
      expect(() => destroyIsolatedUndoManagers(undefined)).not.toThrow();
    });
  });

  describe('patchYjsOriginSync 幂等性与修补', () => {
    it('连续多次调用具有 Symbol 幂等性，不产生重复包装', () => {
      const originalDispatch = vi.fn();
      const mockEditor = {
        view: {
          dispatch: originalDispatch,
        },
      } as unknown as Editor;

      const originalTransact = doc.transact;

      patchYjsOriginSync(mockEditor, doc);
      expect((mockEditor as any)[PATCHED_SYMBOL]).toBe(true);

      const firstPatchedDispatch = mockEditor.view.dispatch;
      const firstPatchedTransact = doc.transact;
      expect(firstPatchedTransact).not.toBe(originalTransact);

      // 再次调用
      patchYjsOriginSync(mockEditor, doc);

      // 引用不应再被二次包装
      expect(mockEditor.view.dispatch).toBe(firstPatchedDispatch);
      expect(doc.transact).toBe(firstPatchedTransact);
    });
  });
});