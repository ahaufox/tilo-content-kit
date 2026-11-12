/**
 * theme/modifiers — L2 预置变体注册表
 *
 * 分工：token（L1）只能改"值"，改不了"结构/组合"。像"紧凑排版""信笺抬头"这类
 * 成组差异，由本注册表给出**编译期存在**的 class；后端只能选择 id，不能下发 class
 * 或 CSS 文本，避免样式注入与版本漂移。
 *
 * 扩展方式：宿主可传入自己的注册表（`modifierClassNames(ids, MY_MODIFIERS)`），
 * 新增变体时同步在 `styles.css` 中补齐对应规则。
 */
import { pickModifiers } from './tokens';

export interface ThemeModifier {
  /** 后端下发的标识 */
  id: string;
  /** 对应的 class（必须存在于随包 CSS 或宿主 CSS） */
  className: string;
  description: string;
}

/** 随包提供的基线变体（样式见 src/styles/index.css 的 `--tk-*` 变体段） */
export const DEFAULT_MODIFIERS: readonly ThemeModifier[] = [
  { id: 'compact', className: 'tk-content--compact', description: '紧凑排版：行距与表格内边距收敛' },
  { id: 'letterhead', className: 'tk-content--letterhead', description: '信笺抬头：顶部预留抬头/装订留白' },
];

/**
 * 把后端下发的变体 id 列表映射为 class 列表。
 *
 * - 未知 id 直接忽略（不拼接、不报错）；
 * - 自动去重；
 * - 非数组入参返回空数组。
 */
export function modifierClassNames(
  modifiers: unknown,
  registry: readonly ThemeModifier[] = DEFAULT_MODIFIERS,
): string[] {
  const allowed = registry.map((m) => m.id);
  const picked = pickModifiers(modifiers, allowed);
  const byId = new Map(registry.map((m) => [m.id, m.className]));
  return picked.map((id) => byId.get(id)!).filter(Boolean);
}
