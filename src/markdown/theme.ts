/**
 * theme — /markdown 容器主题（0.6.0 起由随包 CSS 承担）
 *
 * 历史：早期用 @tailwindcss/typography 的 prose 工具类做排版，依赖宿主 Tailwind
 * 扫描本包产物（@source），样式正确性由一条不可见的编译期契约决定。
 * 方案 B 之后排版基线写进 `styles.css` 的 `.tk-content` 规则，全部走 `--tk-*`
 * 变量，因此这里不再输出任何 utility 类名。
 *
 * 兼容：两个符号保留导出，避免宿主 import 断裂；值已置空，宿主无需改动即可运行。
 */

/**
 * @deprecated 随包 CSS 已提供排版基线，本常量恒为空数组；1.0 移除。
 */
export const MARKDOWN_PROSE_CLASSES: readonly string[] = [];

/**
 * @deprecated 随包 CSS 已提供排版基线，本常量恒为空字符串；1.0 移除。
 */
export const defaultMarkdownClassName = '';
