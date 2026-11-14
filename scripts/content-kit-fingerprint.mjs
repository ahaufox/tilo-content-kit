#!/usr/bin/env node
/**
 * content-kit-fingerprint.mjs — @tilo-ui/content-kit 源码指纹计算器（发布变更检测基线）
 *
 * 职责：
 *   1. 遍历 src/ 目录下所有源码文件（.ts, .tsx, .css 等）；
 *   2. 读取 tsup.config.ts 与 package.json 核心字段（剔除 version 元数据）；
 *   3. 按相对路径排序，对文件路径与内容进行规范化 SHA-256 聚合；
 *   4. 输出 `sha256:<hex>`，退出码 0 表示计算成功。
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SDK_ROOT = path.resolve(__dirname, '..');

function getAllFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      getAllFiles(fullPath, fileList);
    } else if (entry.isFile()) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

function hashFile(hasher, absPath, relPath) {
  hasher.update(relPath);
  const content = fs.readFileSync(absPath);
  hasher.update(content);
}

function hashPackageJson(hasher, pkgPath) {
  if (!fs.existsSync(pkgPath)) return;
  const raw = fs.readFileSync(pkgPath, 'utf8');
  const pkg = JSON.parse(raw);
  // 剔除版本号与发布状态等易变元数据，仅关注依赖、导出与脚本
  delete pkg.version;
  delete pkg.scripts?.usage;
  const canonical = JSON.stringify(pkg, Object.keys(pkg).sort());
  hasher.update('package.json');
  hasher.update(canonical);
}

function main() {
  const hasher = crypto.createHash('sha256');

  // 1. src/ 目录下所有文件
  const srcDir = path.join(SDK_ROOT, 'src');
  const srcFiles = getAllFiles(srcDir).sort();
  for (const file of srcFiles) {
    const rel = path.relative(SDK_ROOT, file);
    hashFile(hasher, file, rel);
  }

  // 2. tsup 构建配置
  const tsupConfig = path.join(SDK_ROOT, 'tsup.config.ts');
  if (fs.existsSync(tsupConfig)) {
    hashFile(hasher, tsupConfig, 'tsup.config.ts');
  }

  // 3. package.json 规范化
  hashPackageJson(hasher, path.join(SDK_ROOT, 'package.json'));

  const digest = hasher.digest('hex');
  console.log(`sha256:${digest}`);
}

main();

