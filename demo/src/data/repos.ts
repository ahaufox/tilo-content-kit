/**
 * 仓库坐标 — 同一份源码双端托管
 *
 * GitHub 为对外镜像（Pages 文档站、Issue 模板、Actions 都在那一侧），
 * CNB 为主开发仓。站内所有仓库链接都从这里取，避免各处硬编码两串 URL。
 */
export type RepoId = 'github' | 'cnb';

export interface RepoRef {
  id: RepoId;
  /** 链路上显示的名字 */
  label: string;
  /** 仓库首页 */
  url: string;
  /** 去掉协议的主机 + 路径，用于正文里以纯文本展示 */
  short: string;
  /** 分支文件链接前缀（GitHub 与 CNB 的 blob 路径规则不同） */
  blobMain: string;
}

export const REPOS: readonly RepoRef[] = [
  {
    id: 'github',
    label: 'GitHub',
    url: 'https://github.com/ahaufox/tilo-content-kit',
    short: 'github.com/ahaufox/tilo-content-kit',
    blobMain: 'https://github.com/ahaufox/tilo-content-kit/blob/main',
  },
  {
    id: 'cnb',
    label: 'CNB',
    url: 'https://cnb.cool/tilo-work/tilo-content-kit',
    short: 'cnb.cool/tilo-work/tilo-content-kit',
    blobMain: 'https://cnb.cool/tilo-work/tilo-content-kit/-/blob/main',
  },
] as const;

export const GITHUB = REPOS[0];
export const CNB = REPOS[1];
