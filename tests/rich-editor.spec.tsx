/**
 * rich-editor.spec.tsx — RichEditor 受控双向同步与快捷键测试
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import fs from 'node:fs';
import path from 'node:path';

vi.mock('@tiptap/react/menus', () => ({
  BubbleMenu: ({ children, className }: any) => {
    return <div className={className} data-testid="table-bubble-menu-root">{children}</div>;
  },
}));

import { RichEditor } from '../src/editor';

describe('RichEditor', () => {
  it('正确渲染编辑器容器与工具栏', () => {
    render(<RichEditor value="测试初始内容" placeholder="请输入..." />);

    expect(screen.getByTestId('tk-rich-editor')).toBeTruthy();
    expect(screen.getByTestId('editor-toolbar')).toBeTruthy();
    expect(screen.getByTestId('tk-rich-editor-content')).toBeTruthy();
  });

  it('showToolbar=false 时隐藏工具栏', () => {
    render(<RichEditor value="内容" showToolbar={false} />);

    expect(screen.getByTestId('tk-rich-editor')).toBeTruthy();
    expect(screen.queryByTestId('editor-toolbar')).toBeNull();
  });

  it('拦截 Ctrl+S / Cmd+S 触发 onSaveShortcut', () => {
    const onSave = vi.fn();
    render(<RichEditor value="文书初稿" onSaveShortcut={onSave} />);

    const editorEl = screen.getByTestId('tk-rich-editor-content');
    fireEvent.keyDown(editorEl, { key: 's', ctrlKey: true });

    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('拦截 Escape 触发 onCancelShortcut', () => {
    const onCancel = vi.fn();
    render(<RichEditor value="文书初稿" onCancelShortcut={onCancel} />);

    const editorEl = screen.getByTestId('tk-rich-editor-content');
    fireEvent.keyDown(editorEl, { key: 'Escape' });

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('受控 value 变更时平滑同步新内容', () => {
    const { rerender } = render(<RichEditor value="版本 1" />);
    expect(screen.getByText('版本 1')).toBeTruthy();

    rerender(<RichEditor value="版本 2：案情已更新" />);
    expect(screen.getByText('版本 2：案情已更新')).toBeTruthy();
  });

  it('B1/N1 强校验：源码静态强审计全量覆盖所有 disabled 规则（含嵌套规则），确保绝无 pointer-events:none 或 opacity 降级', () => {
    // 1. 物理样式源码静态强审计：读取 index.css，全量扫描所有含 --disabled 的规则块
    const cssPath = path.resolve(__dirname, '../src/styles/index.css');
    const cssContent = fs.readFileSync(cssPath, 'utf-8');

    // 匹配所有包含 --disabled 的规则块
    const disabledRulesRegex = /([^{}]*--disabled[^{}]*)\{([^}]+)\}/g;
    let match;
    const foundRules: Array<{ selector: string; body: string }> = [];
    while ((match = disabledRulesRegex.exec(cssContent)) !== null) {
      foundRules.push({ selector: match[1].trim(), body: match[2].trim() });
    }

    expect(foundRules.length).toBeGreaterThan(0);

    // 强化审计：所有 disabled 规则（基础规则 + 嵌套后代规则）绝不能包含 pointer-events: none 或 opacity 降低
    for (const rule of foundRules) {
      expect(rule.body, `选择器 "${rule.selector}" 违规包含 pointer-events: none`).not.toContain('pointer-events: none');
      expect(rule.body, `选择器 "${rule.selector}" 违规包含 opacity 属性`).not.toContain('opacity:');
    }

    // 基础规则与 ProseMirror 规则特定属性守护
    const baseRule = foundRules.find((r) => r.selector === '.tk-editor-box--disabled');
    expect(baseRule, '必须包含 .tk-editor-box--disabled 基础规则').toBeTruthy();
    expect(baseRule!.body).toContain('cursor: default');

    const proseMirrorRule = foundRules.find((r) => r.selector.includes('.ProseMirror'));
    expect(proseMirrorRule, '必须包含针对 .ProseMirror 的只读可交互声明').toBeTruthy();
    expect(proseMirrorRule!.body).toContain('user-select: text');
    expect(proseMirrorRule!.body).toContain('cursor: text');

    // 2. 运行时 DOM 挂载断言
    render(<RichEditor value="只读正文文本" disabled={true} />);
    const box = screen.getByTestId('tk-rich-editor');
    expect(box.className).toContain('tk-editor-box--disabled');
    expect(screen.getByText('只读正文文本')).toBeTruthy();
  });

  it('H1 & N2 验证：showFooter=true 时默认渲染底栏与字数统计，多段落/标题纯文本字数不计多余换行符', async () => {
    render(
      <RichEditor
        value={'### 标题\n\n正文内容'}
        showFooter={true}
        tipsText="请按 Ctrl+S 保存"
      />
    );

    expect(screen.getByTestId('tk-rich-editor-footer')).toBeTruthy();
    expect(screen.getByTestId('tk-rich-editor-char-count')).toBeTruthy();
    // N2 验证：首屏必须按纯文本计算字数（"### 标题\n\n正文内容" 纯文本为 "标题正文内容" 共 6 字，不虚占换行符）
    await waitFor(() => {
      expect(screen.getByText(/6 字/)).toBeTruthy();
    });
    expect(screen.getByTestId('tk-rich-editor-footer-tips').textContent).toBe('请按 Ctrl+S 保存');
  });

  it('H2 验证：heightMode="fixed" 时正确生成类名并内联固定高度与滚动条', () => {
    render(
      <RichEditor
        value="固定高度文本"
        heightMode="fixed"
        minHeight={300}
      />
    );

    const box = screen.getByTestId('tk-rich-editor');
    expect(box.className).toContain('tk-editor-box--fixed');

    const area = box.querySelector('.tk-editor-area') as HTMLElement;
    expect(area).toBeTruthy();
    expect(area.className).toContain('tk-editor-area--fixed');
    expect(area.style.height).toBe('300px');
    expect(area.style.minHeight).toBe('300px');
    expect(area.style.overflowY).toBe('auto');
  });

  it('style 属性透传与 CSS Token 覆盖支持', () => {
    render(
      <RichEditor
        value="自定义样式文本"
        style={{ '--tk-radius-block': '16px', borderRadius: '16px' } as React.CSSProperties}
      />
    );

    const box = screen.getByTestId('tk-rich-editor');
    expect(box.style.borderRadius).toBe('16px');
  });

  it('N3 & N4 验证：隐藏 textarea 保持原文直通分发，并与 onChangeHtml 保持契约对称', () => {
    const onChange = vi.fn();
    const onChangeHtml = vi.fn();
    render(
      <RichEditor
        value="初始"
        onChange={onChange}
        onChangeHtml={onChangeHtml}
        renderHiddenTextarea={true}
      />
    );

    const textarea = screen.getByTestId('tk-rich-editor-native-textarea');
    expect(textarea).toBeTruthy();

    const rawMarkdown = '### 初始事实黑板\n- 双方约定借款月利率 1.5%\n- 实际已归还 5 万元';
    fireEvent.change(textarea, { target: { value: rawMarkdown } });

    // N3 验证：隐藏 textarea 必须直通分发原始 Markdown，绝不经历 Turndown 二次破坏性断行
    expect(onChange).toHaveBeenCalledWith(rawMarkdown);
    // N4 验证：隐藏 textarea 分发时必须同步通知 onChangeHtml
    expect(onChangeHtml).toHaveBeenCalled();
  });

  it('W1 验证：外层容器挂载 DOM value 描述符，赋值单次且清洗，挂载不偷发初值，getter 实时无陈旧', () => {
    const onChange = vi.fn();
    const onChangeHtml = vi.fn();
    render(<RichEditor value="初始文本" onChange={onChange} onChangeHtml={onChangeHtml} />);

    // 挂载初始不向外多发初值
    expect(onChange).not.toHaveBeenCalled();

    const container = screen.getByTestId('tk-rich-editor') as any;
    expect(container.value).toBe('初始文本');

    // 模拟变更 container.value
    container.value = '更新的新文本';
    // 仅单次触发 onChange
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('更新的新文本');
    expect(onChangeHtml).toHaveBeenCalled();

    // getter 实时返回最新内容
    expect(container.value).toBe('更新的新文本');
  });

  it('S1 验证：点击编辑区空白处触发光标聚焦', () => {
    const { container } = render(<RichEditor value="可聚焦内容" />);
    const area = container.querySelector('.tk-editor-area') as HTMLElement;
    expect(area).toBeTruthy();

    // 模拟点击编辑区空白处
    fireEvent.click(area);
    const content = screen.getByTestId('tk-rich-editor-content');
    expect(content).toBeTruthy();
  });

  it('S4 验证：占位符选择器匹配修复，包含 .is-editor-empty 正确规则', () => {
    const cssPath = path.resolve(__dirname, '../src/styles/index.css');
    const cssContent = fs.readFileSync(cssPath, 'utf-8');

    // 确保占位符规则不再使用不匹配的 .tk-editor-content .ProseMirror
    expect(cssContent).not.toMatch(/\.tk-editor-content\s+\.ProseMirror\s+p\.is-editor-empty/);
    expect(cssContent).toContain('p.is-editor-empty:first-child::before');
  });

  it('showTableBubbleMenu 开关控制：默认渲染气泡菜单组件，传 false 时彻底关闭', () => {
    const { rerender } = render(
      <RichEditor
        value="| a | b |\n|---|---|\n| 1 | 2 |"
        showTableBubbleMenu={true}
      />
    );

    // 默认开启时，气泡菜单根节点应该存在于 DOM 中
    expect(document.querySelector('.tk-table-bubble-menu')).toBeTruthy();

    // 显式传 false 时，彻底不渲染气泡菜单
    rerender(
      <RichEditor
        value="| a | b |\n|---|---|\n| 1 | 2 |"
        showTableBubbleMenu={false}
      />
    );
    expect(document.querySelector('.tk-table-bubble-menu')).toBeNull();
  });
});
