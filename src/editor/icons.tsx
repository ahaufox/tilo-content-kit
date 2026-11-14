/**
 * icons — 编辑器工具栏纯原生内联 SVG 图标
 *
 * 设计边界：零外部图标库依赖（不强绑 lucide-react 或 heroicons）。
 * 统一采用 14x14px、currentColor、strokeWidth 2 风格，自适应主题色与高亮。
 */
import type { SVGProps } from 'react';

function BaseIcon({ children, width = 15, height = 15, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={width}
      height={height}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function IconBold(props: SVGProps<SVGSVGElement>) {
  return (
    <BaseIcon {...props}>
      <path d="M6 12h9a4 4 0 0 1 0 8H6v-8zm0 0V4h8a4 4 0 0 1 0 8H6z" />
    </BaseIcon>
  );
}

export function IconItalic(props: SVGProps<SVGSVGElement>) {
  return (
    <BaseIcon {...props}>
      <line x1="19" y1="4" x2="10" y2="4" />
      <line x1="14" y1="20" x2="5" y2="20" />
      <line x1="15" y1="4" x2="9" y2="20" />
    </BaseIcon>
  );
}

export function IconStrike(props: SVGProps<SVGSVGElement>) {
  return (
    <BaseIcon {...props}>
      <path d="M16 4H9a3 3 0 0 0-2.83 4" />
      <path d="M14 12a4 4 0 0 1 0 8H6" />
      <line x1="4" y1="12" x2="20" y2="12" />
    </BaseIcon>
  );
}

export function IconCode(props: SVGProps<SVGSVGElement>) {
  return (
    <BaseIcon {...props}>
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </BaseIcon>
  );
}

export function IconH1(props: SVGProps<SVGSVGElement>) {
  return (
    <BaseIcon {...props}>
      <path d="M4 12h8" />
      <path d="M4 18V6" />
      <path d="M12 18V6" />
      <path d="m17 12 3-2v8" />
    </BaseIcon>
  );
}

export function IconH2(props: SVGProps<SVGSVGElement>) {
  return (
    <BaseIcon {...props}>
      <path d="M4 12h8" />
      <path d="M4 18V6" />
      <path d="M12 18V6" />
      <path d="M21 18h-4c0-4 4-3 4-6a3 3 0 0 0-6 0" />
    </BaseIcon>
  );
}

export function IconH3(props: SVGProps<SVGSVGElement>) {
  return (
    <BaseIcon {...props}>
      <path d="M4 12h8" />
      <path d="M4 18V6" />
      <path d="M12 18V6" />
      <path d="M17.5 10.5c1.7-1 3.5 0 3.5 1.5a2 2 0 0 1-2 2" />
      <path d="M17 17.5c2 1.5 4 0 4-1.5a2 2 0 0 0-2-2h-2" />
    </BaseIcon>
  );
}

export function IconAlignLeft(props: SVGProps<SVGSVGElement>) {
  return (
    <BaseIcon {...props}>
      <line x1="21" y1="6" x2="3" y2="6" />
      <line x1="15" y1="12" x2="3" y2="12" />
      <line x1="17" y1="18" x2="3" y2="18" />
    </BaseIcon>
  );
}

export function IconAlignCenter(props: SVGProps<SVGSVGElement>) {
  return (
    <BaseIcon {...props}>
      <line x1="21" y1="6" x2="3" y2="6" />
      <line x1="19" y1="12" x2="5" y2="12" />
      <line x1="21" y1="18" x2="3" y2="18" />
    </BaseIcon>
  );
}

export function IconAlignRight(props: SVGProps<SVGSVGElement>) {
  return (
    <BaseIcon {...props}>
      <line x1="21" y1="6" x2="3" y2="6" />
      <line x1="21" y1="12" x2="9" y2="12" />
      <line x1="21" y1="18" x2="7" y2="18" />
    </BaseIcon>
  );
}

export function IconListBullet(props: SVGProps<SVGSVGElement>) {
  return (
    <BaseIcon {...props}>
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </BaseIcon>
  );
}

export function IconListOrdered(props: SVGProps<SVGSVGElement>) {
  return (
    <BaseIcon {...props}>
      <line x1="10" y1="6" x2="21" y2="6" />
      <line x1="10" y1="12" x2="21" y2="12" />
      <line x1="10" y1="18" x2="21" y2="18" />
      <path d="M4 6h1v4" />
      <path d="M4 10h2" />
      <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" />
    </BaseIcon>
  );
}

export function IconBlockquote(props: SVGProps<SVGSVGElement>) {
  return (
    <BaseIcon {...props}>
      <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" />
      <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" />
    </BaseIcon>
  );
}

export function IconTable(props: SVGProps<SVGSVGElement>) {
  return (
    <BaseIcon {...props}>
      <path d="M12 3v18" />
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M3 9h18" />
      <path d="M3 15h18" />
    </BaseIcon>
  );
}

export function IconPalette(props: SVGProps<SVGSVGElement>) {
  return (
    <BaseIcon {...props}>
      <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
      <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
      <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
      <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
    </BaseIcon>
  );
}

export function IconHighlighter(props: SVGProps<SVGSVGElement>) {
  return (
    <BaseIcon {...props}>
      <path d="m9 11-6 6v3h3l6-6" />
      <path d="m22 12-4.6 4.6a2.78 2.78 0 0 1-3.9 0L8.2 11.3a2.78 2.78 0 0 1 0-3.9L12.8 2.8a2.78 2.78 0 0 1 3.9 0L22 8.1a2.78 2.78 0 0 1 0 3.9z" />
    </BaseIcon>
  );
}

export function IconMinus(props: SVGProps<SVGSVGElement>) {
  return (
    <BaseIcon {...props}>
      <line x1="5" y1="12" x2="19" y2="12" />
    </BaseIcon>
  );
}

export function IconUndo(props: SVGProps<SVGSVGElement>) {
  return (
    <BaseIcon {...props}>
      <path d="M3 7v6h6" />
      <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
    </BaseIcon>
  );
}

export function IconRedo(props: SVGProps<SVGSVGElement>) {
  return (
    <BaseIcon {...props}>
      <path d="M21 7v6h-6" />
      <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7" />
    </BaseIcon>
  );
}

export function IconArrowUp(props: SVGProps<SVGSVGElement>) {
  return (
    <BaseIcon {...props}>
      <line x1="12" y1="19" x2="12" y2="5" />
      <polyline points="5 12 12 5 19 12" />
    </BaseIcon>
  );
}

export function IconArrowDown(props: SVGProps<SVGSVGElement>) {
  return (
    <BaseIcon {...props}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <polyline points="19 12 12 19 5 12" />
    </BaseIcon>
  );
}

export function IconArrowLeft(props: SVGProps<SVGSVGElement>) {
  return (
    <BaseIcon {...props}>
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </BaseIcon>
  );
}

export function IconArrowRight(props: SVGProps<SVGSVGElement>) {
  return (
    <BaseIcon {...props}>
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </BaseIcon>
  );
}

export function IconTrash(props: SVGProps<SVGSVGElement>) {
  return (
    <BaseIcon {...props}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </BaseIcon>
  );
}
