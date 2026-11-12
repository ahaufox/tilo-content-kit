import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MODIFIERS,
  modifierClassNames,
  pickModifiers,
  themeStyle,
} from '../src/theme';

describe('themeStyle — 后端配置驱动的 token 校验', () => {
  it('合法 token 映射为 --tk-* 自定义属性', () => {
    const { style, applied, rejected } = themeStyle({
      'font-size-body': '16px',
      'line-height-body': '1.8',
      'text-main': '#000000',
      'font-family-body': '"FangSong", serif',
      'radius-block': '4mm',
    });

    expect(rejected).toEqual([]);
    expect(applied).toHaveLength(5);
    expect(style).toEqual({
      '--tk-font-size-body': '16px',
      '--tk-line-height-body': '1.8',
      '--tk-text-main': '#000000',
      '--tk-font-family-body': '"FangSong", serif',
      '--tk-radius-block': '4mm',
    });
  });

  it('未知 key 被丢弃并给出原因', () => {
    const { style, rejected } = themeStyle({ 'font-size-body': '16px', 'evil-key': '1px' });
    expect(style).toEqual({ '--tk-font-size-body': '16px' });
    expect(rejected).toHaveLength(1);
    expect(rejected[0].key).toBe('evil-key');
    expect(rejected[0].reason).toContain('白名单');
  });

  it('拒绝原型链与构造函数类 key', () => {
    const { style, rejected } = themeStyle({ constructor: '1px', __proto__: '1px' });
    expect(style).toEqual({});
    expect(rejected.length).toBeGreaterThanOrEqual(1);
  });

  it.each([
    ['url(', 'background 注入', { bg: 'url(https://evil.test/a.png)' }],
    ['expression(', '老 IE 表达式', { 'font-size-body': 'expression(alert(1))' }],
    ['javascript:', '伪协议', { tertiary: 'javascript:alert(1)' }],
    [';', '声明拼接', { 'font-size-body': '16px; position: fixed' }],
    ['}', '规则逃逸', { 'text-main': '#000 } body { display:none' }],
  ])('拒绝危险片段 %s（%s）', (_part, _desc, tokens) => {
    const { style, rejected } = themeStyle(tokens as Record<string, unknown>);
    expect(style).toEqual({});
    expect(rejected).toHaveLength(1);
  });

  it('长度值必须带合法单位或为 0', () => {
    expect(themeStyle({ 'font-size-body': '16' }).rejected).toHaveLength(1);
    expect(themeStyle({ 'font-size-body': '0' }).style['--tk-font-size-body']).toBe('0');
    expect(themeStyle({ 'font-size-body': '12px' }).style['--tk-font-size-body']).toBe('12px');
  });

  it('颜色支持 hex / rgb() / 命名色，大写 hex 归一化前原样保留', () => {
    for (const color of ['#FFF', '#ffffff', '#ffffffcc', 'rgb(0 0 0 / 50%)', 'rgba(0,0,0,0.5)', 'black']) {
      expect(themeStyle({ 'text-main': color }).rejected).toEqual([]);
    }
    expect(themeStyle({ 'text-main': 'not-a-color!' }).rejected).toHaveLength(1);
  });

  it('数字型取值可接受（后端常以 number 下发）', () => {
    const { style } = themeStyle({ 'line-height-body': 1.75 });
    expect(style['--tk-line-height-body']).toBe('1.75');
  });

  it('空值与 null 跳过且不计入拒绝', () => {
    const { applied, rejected } = themeStyle({ 'text-main': null, 'text-body': '' });
    expect(applied).toEqual([]);
    expect(rejected).toEqual([]);
  });

  it('非对象入参安全降级', () => {
    expect(themeStyle(null as unknown as Record<string, unknown>)).toEqual({
      style: {},
      applied: [],
      rejected: [],
    });
  });
});

describe('pickModifiers — L2 变体白名单', () => {
  it('仅保留注册表中存在的变体并去重', () => {
    expect(pickModifiers(['letterhead', 'letterhead', 'evil', 42], ['letterhead', 'seal-right'])).toEqual([
      'letterhead',
    ]);
  });

  it('非数组入参返回空', () => {
    expect(pickModifiers('letterhead', ['letterhead'])).toEqual([]);
    expect(pickModifiers(undefined, ['letterhead'])).toEqual([]);
  });
});

describe('modifierClassNames — L2 变体注册表', () => {
  it('已知 id 映射为 class 并去重', () => {
    expect(modifierClassNames(['compact', 'compact', 'letterhead'])).toEqual([
      'tk-content--compact',
      'tk-content--letterhead',
    ]);
  });

  it('未知 id 一律忽略，不参与拼接', () => {
    expect(modifierClassNames(['evil', 'tk-content--compact', 42])).toEqual([]);
    expect(modifierClassNames(undefined)).toEqual([]);
  });

  it('支持宿主自定义注册表，且不影响默认注册表', () => {
    const registry = [{ id: 'two-col', className: 'host--two-col', description: '两栏' }];
    expect(modifierClassNames(['two-col'], registry)).toEqual(['host--two-col']);
    expect(DEFAULT_MODIFIERS.map((m) => m.id)).not.toContain('two-col');
  });

  it('默认注册表包含 compact 与 letterhead', () => {
    expect(DEFAULT_MODIFIERS.map((m) => m.id)).toEqual(['compact', 'letterhead']);
  });
});
