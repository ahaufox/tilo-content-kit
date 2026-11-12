/**
 * InstallTabs — 包管理器安装命令切换（pnpm / npm / yarn）
 *
 * 三条命令的包名与版本来自 data/snippets 的 INSTALL_SNIPPETS，切换 Tab 即换文案，
 * 复制按钮拿到的始终是当前 Tab 的字符串。默认 pnpm（仓库自身的包管理器）。
 */
import { useState } from 'react';
import { INSTALL_SNIPPETS, PACKAGE_MANAGERS, type PackageManager } from '../data/snippets';
import { Tabs } from './Tabs';
import { CopyButton } from './CodeSample';

const LABELS: Record<PackageManager, string> = { pnpm: 'pnpm', npm: 'npm', yarn: 'yarn' };

export function InstallTabs({ className }: { className?: string }) {
  const [pm, setPm] = useState<PackageManager>('pnpm');
  const command = INSTALL_SNIPPETS[pm];

  return (
    <div className={`install-tabs ${className ?? ''}`.trim()}>
      <Tabs
        items={PACKAGE_MANAGERS.map((id) => ({ id, label: LABELS[id] }))}
        value={pm}
        onChange={setPm}
        label="包管理器"
      />
      <div className="install-command">
        <code>{command}</code>
        <CopyButton text={command} />
      </div>
    </div>
  );
}

export default InstallTabs;
