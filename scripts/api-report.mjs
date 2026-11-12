#!/usr/bin/env node
/**
 * api-report.mjs — 公共 API 面快照生成与校验
 *
 * 目的：让「导出增删 / 签名变更」在发布前可见、可评审。
 *
 * 为什么不用 api-extractor：
 *   - 本包有 5 个入口（含过渡别名），需维护多份配置；
 *   - tsup 产出的 dts 会跨文件共享 chunk，api-extractor 对 external peer 泛型
 *     （tiptap / prosemirror）解析成本高。
 * 本脚本的做法：把每个入口的 d.ts 与其依赖的本地 chunk 归一化（抹掉内容哈希）
 * 后落盘成带标题的快照，`--check` 与磁盘内容逐字比对。
 *
 * 使用：
 *   pnpm build && pnpm api:update   # 有意变更后刷新快照
 *   pnpm build && pnpm api:check    # CI / 发布前校验
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SDK_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST_DIR = resolve(SDK_DIR, 'dist');
const OUT_DIR = resolve(SDK_DIR, 'api');

/** 入口 → dist 入口文件名 */
const ENTRIES = {
  content: 'content.d.ts',
  convert: 'convert.d.ts',
  legal: 'legal.d.ts',
  theme: 'theme.d.ts',
  markdown: 'markdown.d.ts',
  tiptap: 'tiptap.d.ts',
  collab: 'collab.d.ts',
  'compat-editor': 'compat-editor.d.ts',
};

/** 内容哈希形如 -Dw_tvOeM.js / -BOB13cZ6.js，统一抹除，避免构建抖动 */
function normalizeDts(text) {
  return text
    .replace(/-[A-Za-z0-9_-]{8}\.(d\.ts|js)/g, '.$1')
    .replace(/\r\n/g, '\n')
    .trim();
}

/** 递归收集入口 d.ts 及其本地 chunk 内容（归一化、去重、排序） */
function collectDtsGraph(entryFile, seen = new Set()) {
  const abs = resolve(DIST_DIR, entryFile);
  if (!existsSync(abs) || seen.has(abs)) return [];
  seen.add(abs);

  const normalized = normalizeDts(readFileSync(abs, 'utf8'));
  const parts = [normalized];

  const importRe = /from '\.\/([^']+)'/g;
  let match;
  while ((match = importRe.exec(normalized)) !== null) {
    const dep = match[1];
    const candidates = [
      resolve(DIST_DIR, dep),
      resolve(DIST_DIR, dep.replace(/\.js$/, '.d.ts')),
      resolve(DIST_DIR, dep.replace(/\.d\.ts$/, '.d.ts')),
    ];
    const next = candidates.find((p) => existsSync(p));
    if (next) {
      parts.push(...collectDtsGraph(next.slice(DIST_DIR.length + 1), seen));
    }
  }
  return parts;
}

/** 入口的运行时导出符号（排序），用于人工快速浏览 */
async function readExportNames(entry) {
  const entryJs = resolve(DIST_DIR, `${entry}.js`);
  if (!existsSync(entryJs)) return [];
  const mod = await import(pathToFileURL(entryJs).href);
  return Object.keys(mod).sort();
}

function renderReport(entry, exportNames, graphParts) {
  const body = [...new Set(graphParts)].sort().join('\n\n');
  const digest = createHash('sha256').update(body).digest('hex').slice(0, 16);
  return [
    `# API 快照：@tilo-ui/content-kit/${entry}`,
    '',
    '> 自动生成，请勿手改。刷新：`pnpm api:update`。校验：`pnpm api:check`。',
    '',
    `<!-- 类型摘要 sha256:${digest} -->`,
    '',
    '## 运行时导出符号',
    '',
    ...(exportNames.length ? exportNames.map((name) => `- \`${name}\``) : ['（无）']),
    '',
    '## 类型声明（归一化，含本地共享 chunk）',
    '',
    '```ts',
    body,
    '```',
    '',
  ].join('\n');
}

function firstDiff(expected, actual) {
  const a = expected.split('\n');
  const b = actual.split('\n');
  const lines = [];
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    if (a[i] !== b[i]) {
      lines.push(`  行 ${i + 1}:`);
      lines.push(`    快照: ${a[i] ?? '（无）'}`);
      lines.push(`    当前: ${b[i] ?? '（无）'}`);
      if (lines.length >= 18) break;
    }
  }
  return lines.join('\n');
}

async function main() {
  const update = process.argv.includes('--update');
  if (!existsSync(DIST_DIR)) {
    console.error('✘ 未找到 dist/，请先执行 pnpm build');
    process.exit(1);
  }
  mkdirSync(OUT_DIR, { recursive: true });

  const failures = [];
  for (const [entry, entryFile] of Object.entries(ENTRIES)) {
    const exportNames = await readExportNames(entry);
    const report = renderReport(entry, exportNames, collectDtsGraph(entryFile));
    const outFile = resolve(OUT_DIR, `${entry}.api.md`);

    if (update || !existsSync(outFile)) {
      writeFileSync(outFile, report);
      console.log(`✔ 已写入 api/${entry}.api.md（导出 ${exportNames.length} 个符号）`);
      continue;
    }

    const expected = readFileSync(outFile, 'utf8');
    if (expected !== report) {
      failures.push({ entry, expected, report });
    }
  }

  if (failures.length === 0) {
    console.log('✔ API 面与快照一致');
    return;
  }

  for (const { entry, expected, report } of failures) {
    console.error(`\n✘ 入口 /${entry} 的公共 API 面发生变化：`);
    console.error(firstDiff(expected, report));
  }
  console.error('\n若为有意变更：pnpm api:update → 复核 git diff api/ → 在 CHANGELOG 记录。');
  process.exit(1);
}

await main();
