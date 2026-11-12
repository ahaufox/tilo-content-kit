/**
 * theme/profile — 后端规则驱动的样式档契约（T022 前端侧）
 *
 * 契约来源：`contracts/styles-tokens.md` §7。一份 profile 是前后端共享的最小 SSOT：
 *   - `profile_id` + `version` 定位一份规则，缓存键含指纹，切主题不得命中旧 HTML；
 *   - `tokens` 走 L1（值覆盖，由 `themeStyle` 白名单校验）；
 *   - `modifiers` 走 L2（只能选编译期已存在的变体，由 `modifierClassNames` 映射）。
 *
 * 边界：本文件**不定义**导出侧（docx/PDF）如何消费 profile，也不下发任意 CSS。
 * 前端渲染与后端导出必须读取同一份 JSON；导出器现状仍是各 exporter 硬编码字号，
 * 收敛工作属于后端改动，见 tasks.md T022。
 */
import { modifierClassNames } from './modifiers';
import { themeStyle } from './tokens';
import type { ThemeApplyResult } from './tokens';

export interface DocumentStyleProfile {
  /** 规则档标识，如 `court-complaint`；仅允许字母数字与 - _，防注入与拼接 */
  profile_id: string;
  /** 正整数版本号；每次规则变更必须递增 */
  version: number;
  /** L1 token 值覆盖 */
  tokens?: Record<string, unknown>;
  /** L2 变体 id 列表（未知项在装配时忽略并上报） */
  modifiers?: string[];
}

export interface ParsedProfile {
  profile: DocumentStyleProfile | null;
  /** 校验失败原因（供宿主上报，不抛异常） */
  rejected: string[];
}

const PROFILE_ID_RE = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/;

/**
 * 解析后端下发的 profile（宽容但不接受危险输入）。
 *
 * - `profile_id` 非法、`version` 非正整数时返回 `profile: null`（整档拒绝）；
 * - `tokens` / `modifiers` 类型不对时降级为空，不拖垮整份档；
 * - 绝不把后端字符串拼进 class 或 CSS 文本。
 */
export function parseDocumentStyleProfile(raw: unknown): ParsedProfile {
  const rejected: string[] = [];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { profile: null, rejected: ['profile 必须是对象'] };
  }

  const obj = raw as Record<string, unknown>;
  const id = obj.profile_id;
  if (typeof id !== 'string' || !PROFILE_ID_RE.test(id)) {
    return { profile: null, rejected: ['profile_id 缺失或含非法字符'] };
  }

  const version = obj.version;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    return { profile: null, rejected: ['version 必须是正整数'] };
  }

  let tokens: Record<string, unknown> | undefined;
  if (obj.tokens !== undefined) {
    if (obj.tokens && typeof obj.tokens === 'object' && !Array.isArray(obj.tokens)) {
      tokens = obj.tokens as Record<string, unknown>;
    } else {
      rejected.push('tokens 必须是对象（已忽略）');
      tokens = {};
    }
  }

  let modifiers: string[] | undefined;
  if (obj.modifiers !== undefined) {
    if (Array.isArray(obj.modifiers)) {
      modifiers = obj.modifiers.filter((m): m is string => typeof m === 'string');
      if (modifiers.length !== obj.modifiers.length) {
        rejected.push('modifiers 含非字符串项（已忽略）');
      }
    } else {
      rejected.push('modifiers 必须是数组（已忽略）');
      modifiers = [];
    }
  }

  return {
    profile: { profile_id: id, version, ...(tokens ? { tokens } : {}), ...(modifiers ? { modifiers } : {}) },
    rejected,
  };
}

/**
 * 稳定指纹（FNV-1a，32 位），用于渲染缓存键。
 *
 * 只取 `profile_id` + `version` + 规范化后的 tokens/modifiers；键顺序排序后序列化，
 * 保证后端字段顺序变化不会让同一份规则产生不同指纹。SSR 与 CSR 结果一致。
 */
export function profileFingerprint(profile: DocumentStyleProfile): string {
  const canonical = JSON.stringify({
    profile_id: profile.profile_id,
    version: profile.version,
    tokens: Object.keys(profile.tokens ?? {})
      .sort()
      .map((k) => [k, profile.tokens?.[k]]),
    modifiers: [...(profile.modifiers ?? [])].sort(),
  });

  let hash = 0x811c9dc5;
  for (let i = 0; i < canonical.length; i += 1) {
    hash ^= canonical.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `${profile.profile_id}@${profile.version}-${hash.toString(16).padStart(8, '0')}`;
}

export interface AppliedProfile extends ThemeApplyResult {
  /** L2 变体类名（未知 modifier 已过滤） */
  className: string;
  /** 缓存键：渲染缓存必须包含此指纹 */
  cacheKey: string;
}

/**
 * 把一份 profile 装配为容器的 `style` + `className` + `cacheKey`。
 *
 * 用法：
 * ```tsx
 * const { style, className, cacheKey, rejected } = applyProfile(profile);
 * <article className={cn('tk-content', className)} style={style} data-profile={cacheKey} />
 * ```
 */
export function applyProfile(profile: DocumentStyleProfile): AppliedProfile {
  const { style, applied, rejected } = themeStyle(profile.tokens ?? {});
  return {
    style,
    applied,
    rejected,
    className: modifierClassNames(profile.modifiers ?? []).join(' '),
    cacheKey: profileFingerprint(profile),
  };
}
