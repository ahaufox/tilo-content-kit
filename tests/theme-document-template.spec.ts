/**
 * T022：后端文书模板设置 → 前端规则档的跨语言同构校验
 *
 * 基准样例与 Python 侧共用 `sdks/tilo-export/tests/fixtures/document_style_profile.golden.json`。
 * 两侧实现必须产出完全相同的 profile；任何一侧改动都会被这个测试拦下。
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { applyProfile, profileFromDocumentTemplate } from '../src/theme';

interface GoldenCase {
  name: string;
  settings: Record<string, unknown> | null;
  options: { profileId?: string; version?: number };
  expected: {
    profile_id: string;
    version: number;
    tokens: Record<string, string>;
    modifiers: string[];
  };
}

const fixture = JSON.parse(
  readFileSync(
    resolve(process.cwd(), '../tilo-export/tests/fixtures/document_style_profile.golden.json'),
    'utf8',
  ),
) as { cases: GoldenCase[] };

describe('profileFromDocumentTemplate — 与 Python 同构', () => {
  for (const testCase of fixture.cases) {
    it(`${testCase.name}`, () => {
      const actual = profileFromDocumentTemplate(testCase.settings as never, testCase.options);
      expect(actual).toEqual(testCase.expected);
    });
  }

  it('含分号的字体名被丢弃，不进入 CSS 变量', () => {
    const profile = profileFromDocumentTemplate({
      font_family: '微软雅黑; background:url(javascript:alert(1))',
    });
    expect(profile.tokens).not.toHaveProperty('font-family-body');
    expect(profile.tokens).not.toHaveProperty('font-family-heading');
  });

  it('snake_case 与 camelCase 同时存在时以 snake_case 为准', () => {
    const profile = profileFromDocumentTemplate({
      body_font_size_pt: 12,
      bodyFontSizePt: 16,
      margin_left_mm: 20,
      marginLeftMm: 30,
    });
    expect(profile.tokens?.['font-size-body']).toBe('12pt');
    expect(profile.tokens?.['page-padding-x']).toBe('20mm');
  });

  it('产物可直接交给 applyProfile，token 全部通过白名单', () => {
    const profile = profileFromDocumentTemplate({
      fontFamily: '微软雅黑',
      bodyFontSizePt: 11,
      marginLeftMm: 31.8,
      marginTopMm: 25.4,
    });
    const applied = applyProfile(profile);
    expect(applied.rejected).toEqual([]);
    expect(applied.style['--tk-font-size-body']).toBe('11pt');
    expect(applied.style['--tk-font-family-body']).toBe('微软雅黑');
    expect(applied.style['--tk-page-padding-x']).toBe('31.8mm');
    expect(applied.applied).toHaveLength(5);
  });
});
