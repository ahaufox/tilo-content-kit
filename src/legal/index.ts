/**
 * /legal — 中国法律文书域规则入口（纯函数，零依赖，可 SSR）
 *
 * 为什么单独成入口：这些规则只对中文公文成立（大写数字层级标题、诉讼请求小标题、
 * 文书总标题去重），与"通用内容判定/转换"的版本节奏和复用范围不同。把它们放在
 * /content 里会让通用能力的复用方被域规则绑架。
 */
export { CONTENT_KIT_VERSION } from '../version';
export * from './document-title';
export * from './legal-section-headings';
export * from './normalize';
