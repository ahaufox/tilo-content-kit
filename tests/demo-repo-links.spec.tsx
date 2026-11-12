/**
 * 文档站的双端仓库入口（GitHub + CNB）：
 * 导航、Hero 按钮、范围与边界三处都该给出两条链接，且各自带品牌色图标。
 */
import { render, screen } from '@testing-library/react';
import { RepoLinks } from '../demo/src/components/RepoLinks';
import { REPOS } from '../demo/src/data/repos';

describe('RepoLinks', () => {
  it('三种变体都渲染两条仓库链接，带图标且新窗口打开', () => {
    for (const variant of ['nav', 'buttons', 'text'] as const) {
      const { container, unmount } = render(<RepoLinks variant={variant} />);
      const links = Array.from(container.querySelectorAll('a'));
      expect(links.map((a) => a.getAttribute('href'))).toEqual(REPOS.map((r) => r.url));
      for (const a of links) {
        expect(a.querySelector('svg')).not.toBeNull();
        expect(a.getAttribute('target')).toBe('_blank');
        expect(a.getAttribute('rel')).toBe('noreferrer');
      }
      unmount();
    }
  });

  it('图标按站点分色：GitHub 深灰、CNB 品牌橙', () => {
    render(<RepoLinks />);
    const github = screen.getByTitle(REPOS[0].short);
    const cnb = screen.getByTitle(REPOS[1].short);
    expect(github.querySelector('svg')!.getAttribute('class')).toContain('repo-icon--github');
    expect(cnb.querySelector('svg')!.getAttribute('class')).toContain('repo-icon--cnb');
  });
});
