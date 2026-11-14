/**
 * colors — 编辑器文字颜色与文本高亮预设常量
 *
 * 职责：提供 EditorToolbar 与 ColorPicker 的通用色板配置。
 * 遵循公文与通用报告排版规范，红色高亮（#ef4444）与 Word 导出及法律核对提醒对齐。
 */

export interface ColorOption {
  name: string;
  value: string;
}

/** 常用文字颜色（应用于内容的行内 CSS / HTML 样式，非 UI 主题变量） */
export const DEFAULT_TEXT_COLORS: ColorOption[] = [
  { name: '默认深黑', value: '#1e293b' },
  { name: '专业深蓝', value: '#1e3a8a' },
  { name: '警示鲜红', value: '#ef4444' },
  { name: '法理嫩绿', value: '#10b981' },
  { name: '明亮橙黄', value: '#f97316' },
  { name: '温和暖灰', value: '#64748b' },
];

/** 常用文本高亮颜色（应用于内容的高亮 mark 样式） */
export const DEFAULT_HIGHLIGHT_COLORS: ColorOption[] = [
  { name: '荧光黄', value: '#fef08a' },
  { name: '活力绿', value: '#bbf7d0' },
  { name: '樱花粉', value: '#fbcfe8' },
  { name: '天空蓝', value: '#bfdbfe' },
];
