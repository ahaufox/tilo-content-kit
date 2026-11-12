/**
 * theme/document-template — 后端文书模板设置 → `DocumentStyleProfile`（T022 前端映射）
 *
 * 后端事实源：`tilo_export.template_config.DOCUMENT_TEMPLATE_CONFIG` 与用户
 * `doc_template_settings`（由 `GET /users/profile/doc-template` 返回）。导出侧已经在
 * 消费这份配置（`docx_styles.py` 的 `font_family` / `body_font_size_pt`、
 * `MARGIN_PRESETS`），因此这里做**形状归一化**而不是另立一套主题：屏幕与导出
 * 从同一个输入推导，避免两边各自硬编码字号/页边距。
 *
 * 与 `sdks/tilo-export/src/tilo_export/document_style_profile.py` 逐字段对齐；
 * 任何一侧改动必须同步 `tests/fixtures/document_style_profile.golden.json`
 * 并跑两侧测试（TS: `theme-document-template.spec.ts`，Python: `test_document_style_profile.py`）。
 *
 * 注意：本函数只做形状与类型归一化，**不重复** CSS 注入校验——值是否安全由
 * `themeStyle()` 的 THEME_TOKENS 白名单统一裁决。
 */
import type { DocumentStyleProfile } from './profile';

/** 后端 `DocumentTemplateSettingsResponse` 中与排版相关的字段（两种命名兼容） */
export interface DocumentTemplateSettings {
  font_family?: string;
  fontFamily?: string;
  body_font_size_pt?: number;
  bodyFontSizePt?: number;
  margin_left_mm?: number;
  marginLeftMm?: number;
  margin_top_mm?: number;
  marginTopMm?: number;
  [key: string]: unknown;
}

export interface ProfileFromTemplateOptions {
  /** 默认 `doc-template` */
  profileId?: string;
  /** 后端当前无显式版本号，默认 1；缓存正确性由 `profileFingerprint` 基于内容保证 */
  version?: number;
}

const DEFAULT_PROFILE_ID = 'doc-template';
const FONT_FAMILY_RE = /^[\w\s,'"\-.一-鿿]+$/;

function pick(settings: Record<string, unknown>, snake: string, camel: string): unknown {
  const primary = settings[snake];
  return primary !== undefined && primary !== null ? primary : settings[camel];
}

function asPositiveNumber(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null;
  return value;
}

/** 数值按最短十进制表示，与 Python 的 `%g` 在业务取值范围内一致 */
function formatNumber(value: number): string {
  return String(value);
}

/**
 * 把文书模板设置转换为可交给 `applyProfile()` 的规则档。
 *
 * - 缺字段或类型非法的项直接省略，**不填臆造默认值**（否则会覆盖宿主自己的主题）；
 * - `font_family` 同时用于正文与标题（后端 `heading_font_family` 为空时也是这个语义）；
 * - `page-padding-x` 取左边距：前端版心左右对称，后端左右不等时导出仍各按配置设置；
 * - `version` 默认 1，后端新增版本字段后由调用方透传即可。
 */
export function profileFromDocumentTemplate(
  settings: DocumentTemplateSettings | null | undefined,
  options: ProfileFromTemplateOptions = {},
): DocumentStyleProfile {
  const profile: DocumentStyleProfile = {
    profile_id: options.profileId ?? DEFAULT_PROFILE_ID,
    version: options.version ?? 1,
    tokens: {},
    modifiers: [],
  };
  const tokens = profile.tokens as Record<string, string>;
  if (!settings || typeof settings !== 'object') return profile;

  const raw = settings as Record<string, unknown>;

  const family = pick(raw, 'font_family', 'fontFamily');
  if (typeof family === 'string') {
    const cleaned = family.trim();
    if (cleaned && FONT_FAMILY_RE.test(cleaned)) {
      tokens['font-family-body'] = cleaned;
      tokens['font-family-heading'] = cleaned;
    }
  }

  const bodyPt = asPositiveNumber(pick(raw, 'body_font_size_pt', 'bodyFontSizePt'));
  if (bodyPt !== null) tokens['font-size-body'] = `${formatNumber(bodyPt)}pt`;

  const marginLeft = asPositiveNumber(pick(raw, 'margin_left_mm', 'marginLeftMm'));
  if (marginLeft !== null) tokens['page-padding-x'] = `${formatNumber(marginLeft)}mm`;

  const marginTop = asPositiveNumber(pick(raw, 'margin_top_mm', 'marginTopMm'));
  if (marginTop !== null) tokens['page-padding-y'] = `${formatNumber(marginTop)}mm`;

  return profile;
}
