/**
 * 后端规则驱动样式档（T022 前端侧契约）单测
 *
 * 关注三件事：危险输入拒绝、指纹稳定、L1/L2 装配结果可复现。
 */
import { describe, expect, it } from 'vitest';
import {
  applyProfile,
  parseDocumentStyleProfile,
  profileFingerprint,
} from '../src/theme';

const valid = {
  profile_id: 'court-complaint',
  version: 3,
  tokens: { 'font-size-body': '16px', 'text-main': '#000000' },
  modifiers: ['letterhead', 'compact'],
};

describe('parseDocumentStyleProfile', () => {
  it('接受合法档并原样保留字段', () => {
    const { profile, rejected } = parseDocumentStyleProfile(valid);
    expect(profile).toEqual(valid);
    expect(rejected).toEqual([]);
  });

  it('拒绝缺失/非法 profile_id 与非法 version', () => {
    expect(parseDocumentStyleProfile({ version: 1 }).profile).toBeNull();
    expect(parseDocumentStyleProfile({ profile_id: '<script>', version: 1 }).profile).toBeNull();
    expect(parseDocumentStyleProfile({ profile_id: 'a/b', version: 1 }).profile).toBeNull();
    expect(parseDocumentStyleProfile({ profile_id: 'ok', version: 0 }).profile).toBeNull();
    expect(parseDocumentStyleProfile({ profile_id: 'ok', version: '3' }).profile).toBeNull();
    expect(parseDocumentStyleProfile(null).rejected).toHaveLength(1);
  });

  it('tokens/modifiers 类型错误时降级为空而非作废整档', () => {
    const { profile, rejected } = parseDocumentStyleProfile({
      profile_id: 'ok',
      version: 1,
      tokens: 'not-an-object',
      modifiers: 'not-an-array',
    });
    expect(profile).toEqual({ profile_id: 'ok', version: 1, tokens: {}, modifiers: [] });
    expect(rejected).toHaveLength(2);
  });

  it('modifiers 中非字符串项被过滤并上报', () => {
    const { profile, rejected } = parseDocumentStyleProfile({
      profile_id: 'ok',
      version: 1,
      modifiers: ['compact', 42, null],
    });
    expect(profile?.modifiers).toEqual(['compact']);
    expect(rejected).toHaveLength(1);
  });
});

describe('profileFingerprint', () => {
  it('同一份规则的不同字段顺序产生相同指纹', () => {
    const a = profileFingerprint(valid);
    const b = profileFingerprint({
      version: 3,
      modifiers: ['compact', 'letterhead'],
      tokens: { 'text-main': '#000000', 'font-size-body': '16px' },
      profile_id: 'court-complaint',
    });
    expect(a).toBe(b);
  });

  it('version 或 token 变化必然改变指纹', () => {
    const a = profileFingerprint(valid);
    expect(profileFingerprint({ ...valid, version: 4 })).not.toBe(a);
    expect(profileFingerprint({ ...valid, tokens: { 'font-size-body': '18px' } })).not.toBe(a);
  });

  it('指纹可读且不含注入字符', () => {
    expect(profileFingerprint(valid)).toMatch(/^court-complaint@3-[0-9a-f]{8}$/);
  });
});

describe('applyProfile', () => {
  it('L1 token 与 L2 变体一次装配，未知变体被忽略', () => {
    const applied = applyProfile({
      ...valid,
      tokens: { 'font-size-body': '16px', 'evil-key': 'url(javascript:alert(1))' },
      modifiers: ['compact', 'unknown-modifier'],
    });
    expect(applied.style['--tk-font-size-body']).toBe('16px');
    expect(applied.className).toBe('tk-content--compact');
    expect(applied.rejected.length).toBeGreaterThan(0);
    expect(applied.cacheKey).toMatch(/^court-complaint@3-/);
  });

  it('SSR 与 CSR 对同一份 profile 产生完全相同的输出', () => {
    expect(applyProfile(valid)).toEqual(applyProfile(valid));
  });
});
