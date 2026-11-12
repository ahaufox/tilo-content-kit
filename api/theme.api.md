# API 快照：@tilo-ui/content-kit/theme

> 自动生成，请勿手改。刷新：`pnpm api:update`。校验：`pnpm api:check`。

<!-- 类型摘要 sha256:ca46bee1dd0f1507 -->

## 运行时导出符号

- `CONTENT_KIT_VERSION`
- `DEFAULT_MODIFIERS`
- `THEME_TOKENS`
- `applyProfile`
- `modifierClassNames`
- `parseDocumentStyleProfile`
- `pickModifiers`
- `profileFingerprint`
- `profileFromDocumentTemplate`
- `themeStyle`

## 类型声明（归一化，含本地共享 chunk）

```ts
export { C as CONTENT_KIT_VERSION } from './version.js';

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
type ThemeTokenKind = 'length' | 'color' | 'fontFamily' | 'lineHeight';
/**
 * 允许由调用方覆盖的 token 清单。
 * key 即 CSS 变量名去掉 `--tk-` 前缀（`font-size-body` → `--tk-font-size-body`）。
 */
declare const THEME_TOKENS: {
    readonly 'font-family-body': {
        readonly kind: "fontFamily";
        readonly description: "正文字体族";
    };
    readonly 'font-family-heading': {
        readonly kind: "fontFamily";
        readonly description: "标题字体族";
    };
    readonly 'font-size-body': {
        readonly kind: "length";
        readonly description: "正文字号";
    };
    readonly 'font-size-h1': {
        readonly kind: "length";
        readonly description: "一级标题字号";
    };
    readonly 'font-size-h2': {
        readonly kind: "length";
        readonly description: "二级标题字号";
    };
    readonly 'font-size-h3': {
        readonly kind: "length";
        readonly description: "三级标题字号";
    };
    readonly 'line-height-body': {
        readonly kind: "lineHeight";
        readonly description: "正文行高";
    };
    readonly 'text-main': {
        readonly kind: "color";
        readonly description: "主文本/标题色";
    };
    readonly 'text-body': {
        readonly kind: "color";
        readonly description: "正文色";
    };
    readonly 'text-muted': {
        readonly kind: "color";
        readonly description: "次要文本色";
    };
    readonly bg: {
        readonly kind: "color";
        readonly description: "页面底色（代码块底）";
    };
    readonly card: {
        readonly kind: "color";
        readonly description: "卡片/表头底色";
    };
    readonly border: {
        readonly kind: "color";
        readonly description: "分割线与边框色";
    };
    readonly tertiary: {
        readonly kind: "color";
        readonly description: "链接色";
    };
    readonly 'table-border': {
        readonly kind: "color";
        readonly description: "表格边框色";
    };
    readonly 'radius-block': {
        readonly kind: "length";
        readonly description: "块级圆角";
    };
    readonly 'radius-chip': {
        readonly kind: "length";
        readonly description: "行内容器圆角";
    };
    readonly 'page-padding-x': {
        readonly kind: "length";
        readonly description: "版心左右内边距（打印）";
    };
    readonly 'page-padding-y': {
        readonly kind: "length";
        readonly description: "版心上下内边距（打印）";
    };
    readonly 'table-cell-padding-x': {
        readonly kind: "length";
        readonly description: "表格单元格横向内边距";
    };
    readonly 'table-cell-padding-y': {
        readonly kind: "length";
        readonly description: "表格单元格纵向内边距";
    };
};
type ThemeTokenKey = keyof typeof THEME_TOKENS;
interface ThemeTokenRejection {
    key: string;
    value: string;
    reason: string;
}
interface ThemeApplyResult {
    /** 可直接展开到 style 的 CSS 自定义属性 */
    style: Record<string, string>;
    /** 生效的 token */
    applied: ThemeTokenKey[];
    /** 被丢弃的 token 及原因（调用方应上报，便于排查配置错误） */
    rejected: ThemeTokenRejection[];
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
declare function themeStyle(tokens: Record<string, unknown>): ThemeApplyResult;
/** 供宿主渲染 modifier class 前的白名单校验（L2 层）：未知变体一律忽略。 */
declare function pickModifiers(modifiers: unknown, allowed: readonly string[]): string[];

interface ThemeModifier {
    /** 后端下发的标识 */
    id: string;
    /** 对应的 class（必须存在于随包 CSS 或宿主 CSS） */
    className: string;
    description: string;
}
/** 随包提供的基线变体（样式见 src/styles/index.css 的 `--tk-*` 变体段） */
declare const DEFAULT_MODIFIERS: readonly ThemeModifier[];
/**
 * 把后端下发的变体 id 列表映射为 class 列表。
 *
 * - 未知 id 直接忽略（不拼接、不报错）；
 * - 自动去重；
 * - 非数组入参返回空数组。
 */
declare function modifierClassNames(modifiers: unknown, registry?: readonly ThemeModifier[]): string[];

interface DocumentStyleProfile {
    /** 规则档标识，如 `court-complaint`；仅允许字母数字与 - _，防注入与拼接 */
    profile_id: string;
    /** 正整数版本号；每次规则变更必须递增 */
    version: number;
    /** L1 token 值覆盖 */
    tokens?: Record<string, unknown>;
    /** L2 变体 id 列表（未知项在装配时忽略并上报） */
    modifiers?: string[];
}
interface ParsedProfile {
    profile: DocumentStyleProfile | null;
    /** 校验失败原因（供宿主上报，不抛异常） */
    rejected: string[];
}
/**
 * 解析后端下发的 profile（宽容但不接受危险输入）。
 *
 * - `profile_id` 非法、`version` 非正整数时返回 `profile: null`（整档拒绝）；
 * - `tokens` / `modifiers` 类型不对时降级为空，不拖垮整份档；
 * - 绝不把后端字符串拼进 class 或 CSS 文本。
 */
declare function parseDocumentStyleProfile(raw: unknown): ParsedProfile;
/**
 * 稳定指纹（FNV-1a，32 位），用于渲染缓存键。
 *
 * 只取 `profile_id` + `version` + 规范化后的 tokens/modifiers；键顺序排序后序列化，
 * 保证后端字段顺序变化不会让同一份规则产生不同指纹。SSR 与 CSR 结果一致。
 */
declare function profileFingerprint(profile: DocumentStyleProfile): string;
interface AppliedProfile extends ThemeApplyResult {
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
declare function applyProfile(profile: DocumentStyleProfile): AppliedProfile;

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

/** 后端 `DocumentTemplateSettingsResponse` 中与排版相关的字段（两种命名兼容） */
interface DocumentTemplateSettings {
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
interface ProfileFromTemplateOptions {
    /** 默认 `doc-template` */
    profileId?: string;
    /** 后端当前无显式版本号，默认 1；缓存正确性由 `profileFingerprint` 基于内容保证 */
    version?: number;
}
/**
 * 把文书模板设置转换为可交给 `applyProfile()` 的规则档。
 *
 * - 缺字段或类型非法的项直接省略，**不填臆造默认值**（否则会覆盖宿主自己的主题）；
 * - `font_family` 同时用于正文与标题（后端 `heading_font_family` 为空时也是这个语义）；
 * - `page-padding-x` 取左边距：前端版心左右对称，后端左右不等时导出仍各按配置设置；
 * - `version` 默认 1，后端新增版本字段后由调用方透传即可。
 */
declare function profileFromDocumentTemplate(settings: DocumentTemplateSettings | null | undefined, options?: ProfileFromTemplateOptions): DocumentStyleProfile;

export { type AppliedProfile, DEFAULT_MODIFIERS, type DocumentStyleProfile, type DocumentTemplateSettings, type ParsedProfile, type ProfileFromTemplateOptions, THEME_TOKENS, type ThemeApplyResult, type ThemeModifier, type ThemeTokenKey, type ThemeTokenKind, type ThemeTokenRejection, applyProfile, modifierClassNames, parseDocumentStyleProfile, pickModifiers, profileFingerprint, profileFromDocumentTemplate, themeStyle };
```
