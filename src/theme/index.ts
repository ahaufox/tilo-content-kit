/**
 * /theme — 主题 token 与变体契约入口（零依赖，可在服务端直接调用）
 *
 * 规则驱动分两层：
 *   L1 token：`themeStyle(profile.tokens)` → 内联 `--tk-*` 变量，只能改值；
 *   L2 变体：`modifierClassNames(profile.modifiers)` → 编译期存在的 class，只能选不能造。
 *
 * 不允许后端下发 CSS 文本；结构性差异请走 L2 注册表或新增组件。
 * `parseDocumentStyleProfile` / `applyProfile` / `profileFingerprint` 把两层与版本指纹
 * 串成一次调用，供前端渲染与缓存使用（T022 前端侧契约）。
 */
export { CONTENT_KIT_VERSION } from '../version';
export {
  THEME_TOKENS,
  pickModifiers,
  themeStyle,
} from './tokens';
export type {
  ThemeApplyResult,
  ThemeTokenKey,
  ThemeTokenKind,
  ThemeTokenRejection,
} from './tokens';
export { DEFAULT_MODIFIERS, modifierClassNames } from './modifiers';
export type { ThemeModifier } from './modifiers';
export { profileFromDocumentTemplate } from './document-template';
export type {
  DocumentTemplateSettings,
  ProfileFromTemplateOptions,
} from './document-template';
export {
  applyProfile,
  parseDocumentStyleProfile,
  profileFingerprint,
} from './profile';
export type {
  AppliedProfile,
  DocumentStyleProfile,
  ParsedProfile,
} from './profile';
