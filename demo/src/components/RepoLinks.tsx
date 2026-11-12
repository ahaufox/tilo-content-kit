/**
 * RepoLinks — 双端仓库入口（GitHub + CNB），带各自品牌色图标
 *
 * 两个站点是同一份源码：GitHub 为对外镜像（Pages 文档站与 Actions 在那侧），
 * CNB 为主开发仓。链接一律取自 data/repos，图标在这里内联，避免外部图片依赖。
 */
import { REPOS, type RepoId } from '../data/repos';

function GitHubIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      className="repo-icon repo-icon--github"
      width={size}
      height={size}
      viewBox="0 0 16 16"
      aria-hidden="true"
      focusable="false"
      fill="currentColor"
    >
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.4 7.4 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}

function CnbIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      className="repo-icon repo-icon--cnb"
      width={size}
      height={size}
      viewBox="0 0 320 320"
      aria-hidden="true"
      focusable="false"
      fill="currentColor"
    >
      <path d="M228.906 40.2412C229.882 37.5108 228.906 34.3903 226.759 32.44C219.342 26.004 200.799 12.3519 173.082 10.4016C141.852 8.06121 122.528 16.4475 112.769 22.6885C108.474 25.4189 108.279 31.4649 112.183 34.3903L191.625 96.2149C198.652 101.676 208.997 98.5553 211.729 90.169L228.711 40.2412H228.906Z" />
      <path d="M32.9381 223.564C29.6199 225.71 28.2536 229.805 29.2295 233.511C32.1573 244.432 41.3312 266.861 66.9009 287.534C92.4706 308.012 122.725 310.353 135.607 309.963C139.511 309.963 142.829 307.427 144 303.722L194.945 142.627C198.653 130.925 185.576 121.173 175.426 127.999L32.9381 223.564Z" />
      <path d="M70.2169 53.4955C67.6794 52.5203 64.9468 52.7153 62.6045 53.8855C53.2355 58.9563 29.032 74.7538 16.54 107.324C6.78054 132.288 10.0987 159.982 12.8314 173.439C13.6121 177.925 18.2967 180.46 22.5908 178.705L175.424 119.026C186.354 114.735 186.354 99.3276 175.424 95.0369L70.2169 53.4955Z" />
      <path d="M297.03 168.968C301.519 171.893 307.57 169.358 308.351 164.092C310.303 150.05 312.06 125.866 304.057 107.338C293.321 82.9591 274.974 67.7468 266.19 61.7008C263.458 59.7505 259.749 59.9456 257.212 62.2859L218.564 96.4162C212.318 102.072 212.904 112.019 219.931 116.699L297.03 168.968Z" />
      <path d="M189.089 299.428C188.699 303.914 192.603 307.814 197.092 307.229C211.731 305.669 241.79 299.818 264.237 278.365C286.098 257.496 293.32 232.728 295.272 222.781C295.858 220.051 295.272 217.32 293.515 215.175L225.98 131.897C218.758 122.925 204.119 127.411 203.143 138.918L189.089 299.233V299.428Z" />
    </svg>
  );
}

const ICONS: Record<RepoId, typeof GitHubIcon> = { github: GitHubIcon, cnb: CnbIcon };

export function RepoIcon({ id, size = 16 }: { id: RepoId; size?: number }) {
  const Icon = ICONS[id];
  return <Icon size={size} />;
}

/**
 * variant
 * - `nav`：导航栏用，图标 + 站点名
 * - `buttons`：Hero 按钮组用，沿用 .btn 视觉
 * - `text`：正文 / 页脚用，图标 + 完整仓库坐标
 */
export function RepoLinks({
  variant = 'nav',
  className,
}: {
  variant?: 'nav' | 'buttons' | 'text';
  className?: string;
}) {
  const cls = ['repo-links', `repo-links--${variant}`, className].filter(Boolean).join(' ');

  return (
    <span className={cls}>
      {REPOS.map((repo) => (
        <a
          key={repo.id}
          className={variant === 'buttons' ? 'btn ghost repo-btn' : 'repo-link'}
          href={repo.url}
          target="_blank"
          rel="noreferrer"
          title={repo.short}
        >
          <RepoIcon id={repo.id} />
          <span>{variant === 'text' ? repo.short : repo.label}</span>
        </a>
      ))}
    </span>
  );
}

export default RepoLinks;
