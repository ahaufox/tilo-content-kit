/**
 * theme/tokens — 主题 token 白名单与值校验（后端规则驱动的唯一入口）
 *
 * 背景：样式方案 B 之后，SDK 的全部视觉声明都消费 `--tk-*` 变量，因此
 * "后端下发配置驱动主题"只需下发变量值，不需要重建 CSS。但变量值会进入
 * 内联 style，必须经过白名单与格式校验，避免样式注入与打印错版。
 *
 * 本文件是 token 契约的代码侧 SSOT：
 *   - `THEME_TOKENS` 决定允许哪些 key（未知 key 一律丢弃）；
 *   - 每种 kind 对应一条值正则；
 *   - `themeStyle()` 返回可直接展开到 React style 的自定义属性对象。
 *
 * 设计取舍：
 *   - 不引入 React 类型，保持零依赖，服务端渲染可直接调用；
 *   - 不做"结构类"能力（如把表格变卡片），结构性差异走 L2 modifier；
 *   - 拒绝任何含 `url(` / `expression(` / `@import` / 分号的取值，杜绝 CSS 注入。
 */

/** token 值类型 */
export type ThemeTokenKind = 'length' | 'color' | 'fontFamily' | 'lineHeight';

interface ThemeTokenSpec {
  kind: ThemeTokenKind;
  /** 语义说明，同时作为契约文档的生成来源 */
  description: string;
}

/**
 * 允许由调用方覆盖的 token 清单。
 * key 即 CSS 变量名去掉 `--tk-` 前缀（`font-size-body` → `--tk-font-size-body`）。
 */
export const THEME_TOKENS = {
  'font-family-body': { kind: 'fontFamily', description: '正文字体族' },
  'font-family-heading': { kind: 'fontFamily', description: '标题字体族' },
  'font-size-body': { kind: 'length', description: '正文字号' },
  'font-size-h1': { kind: 'length', description: '一级标题字号' },
  'font-size-h2': { kind: 'length', description: '二级标题字号' },
  'font-size-h3': { kind: 'length', description: '三级标题字号' },
  'line-height-body': { kind: 'lineHeight', description: '正文行高' },
  'text-main': { kind: 'color', description: '主文本/标题色' },
  'text-body': { kind: 'color', description: '正文色' },
  'text-muted': { kind: 'color', description: '次要文本色' },
  bg: { kind: 'color', description: '页面底色（代码块底）' },
  card: { kind: 'color', description: '卡片/表头底色' },
  border: { kind: 'color', description: '分割线与边框色' },
  tertiary: { kind: 'color', description: '链接色' },
  'surface-low': { kind: 'color', description: '低阶表面色（表头底 / 隔行底混合基色）' },
  'table-border': { kind: 'color', description: '表格边框色' },
  'radius-block': { kind: 'length', description: '块级圆角' },
  'radius-chip': { kind: 'length', description: '行内容器圆角' },
  'page-padding-x': { kind: 'length', description: '版心左右内边距（打印）' },
  'page-padding-y': { kind: 'length', description: '版心上下内边距（打印）' },
  'table-cell-padding-x': { kind: 'length', description: '表格单元格横向内边距' },
  'table-cell-padding-y': { kind: 'length', description: '表格单元格纵向内边距' },
} as const satisfies Record<string, ThemeTokenSpec>;

export type ThemeTokenKey = keyof typeof THEME_TOKENS;

export interface ThemeTokenRejection {
  key: string;
  value: string;
  reason: string;
}

export interface ThemeApplyResult {
  /** 可直接展开到 style 的 CSS 自定义属性 */
  style: Record<string, string>;
  /** 生效的 token */
  applied: ThemeTokenKey[];
  /** 被丢弃的 token 及原因（调用方应上报，便于排查配置错误） */
  rejected: ThemeTokenRejection[];
}

const LENGTH_RE = /^-?(?:\d+(?:\.\d+)?)(?:px|pt|mm|cm|em|rem|%)$/;
const LINE_HEIGHT_RE = /^-?(?:\d+(?:\.\d+)?)(?:px|pt|mm|cm|em|rem|%)?$/;
const HEX_COLOR_RE = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const FUNC_COLOR_RE = /^(?:rgb|rgba|hsl|hsla)\(\s*[0-9a-z%.,\s/+-]+\)$/i;
const NAMED_COLOR_RE = /^[a-z]{3,20}$/i;
const FONT_FAMILY_RE = /^[\w\s,'"\-.\u4e00-\u9fa5]+$/;

/** 任何取值都不得出现的危险片段（CSS 注入与外部引用） */
const FORBIDDEN_VALUE_PARTS = ['url(', 'expression(', 'javascript:', '@import', 'behavior:', '-moz-binding', '\\', ';', '{', '}', '<', '>'];

function validateValue(kind: ThemeTokenKind, raw: string): string | null {
  const value = raw.trim();
  if (!value) return '取值为空';
  const lowered = value.toLowerCase();
  for (const part of FORBIDDEN_VALUE_PARTS) {
    if (lowered.includes(part)) return `包含禁止片段 ${part}`;
  }

  switch (kind) {
    case 'length':
      // 0 允许无单位；其余必须带单位，避免 font-size: 16 这类无效声明
      return value === '0' || LENGTH_RE.test(value)
        ? null
        : '长度值非法（允许 px/pt/mm/cm/em/rem/%，或单独的 0）';
    case 'lineHeight':
      return LINE_HEIGHT_RE.test(value) ? null : '行高值非法（允许无单位数字或长度单位）';
    case 'color':
      return HEX_COLOR_RE.test(value) || FUNC_COLOR_RE.test(value) || NAMED_COLOR_RE.test(value)
        ? null
        : '颜色值非法（允许 hex / rgb() / hsl() / 命名颜色）';
    case 'fontFamily':
      return FONT_FAMILY_RE.test(value) && value.length <= 200
        ? null
        : '字体族非法（仅允许字面量、引号、逗号与空白）';
    default:
      return '未知类型';
  }
}

/**
 * 把后端下发的 token 配置转换为可展开的 CSS 自定义属性。
 *
 * @param tokens 后端配置的 token 映射（key 必须是 `THEME_TOKENS` 中的键）
 * @returns 生效变量、丢弃明细
 *
 * @example
 * const { style, rejected } = themeStyle({ 'font-size-body': '16px', 'text-main': '#000' });
 * // <article style={style} />
 */
export function themeStyle(tokens: Record<string, unknown>): ThemeApplyResult {
  const style: Record<string, string> = {};
  const applied: ThemeTokenKey[] = [];
  const rejected: ThemeTokenRejection[] = [];

  if (!tokens || typeof tokens !== 'object') {
    return { style, applied, rejected };
  }

  for (const [key, rawValue] of Object.entries(tokens)) {
    if (rawValue === null || rawValue === undefined) continue;
    const spec = Object.hasOwn(THEME_TOKENS, key)
      ? (THEME_TOKENS as Record<string, ThemeTokenSpec>)[key]
      : undefined;
    if (!spec) {
      rejected.push({ key, value: String(rawValue), reason: '未在 token 白名单中' });
      continue;
    }
    const value = typeof rawValue === 'number' ? String(rawValue) : String(rawValue);
    // 空字符串按"未配置"处理，不计入拒绝（后端配置常以空串表示不覆盖）
    if (!value.trim()) continue;
    const error = validateValue(spec.kind, value);
    if (error) {
      rejected.push({ key, value, reason: error });
      continue;
    }
    style[`--tk-${key}`] = value.trim();
    applied.push(key as ThemeTokenKey);
  }

  return { style, applied, rejected };
}

/** 供宿主渲染 modifier class 前的白名单校验（L2 层）：未知变体一律忽略。 */
export function pickModifiers(modifiers: unknown, allowed: readonly string[]): string[] {
  if (!Array.isArray(modifiers)) return [];
  const allowSet = new Set(allowed);
  const seen = new Set<string>();
  const picked: string[] = [];
  for (const item of modifiers) {
    if (typeof item !== 'string') continue;
    const name = item.trim();
    if (!name || !allowSet.has(name) || seen.has(name)) continue;
    seen.add(name);
    picked.push(name);
  }
  return picked;
}
