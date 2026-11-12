import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CONTENT_KIT_VERSION as contentVersion } from '../src/content/index';
import { CONTENT_KIT_VERSION as markdownVersion } from '../src/markdown/index';
import { CONTENT_KIT_VERSION as tiptapVersion, ResizableTable } from '../src/tiptap/index';
import { CONTENT_KIT_VERSION as collabVersion } from '../src/collab/index';
import {
  CONTENT_KIT_VERSION as compatVersion,
  ResizableTable as CompatResizableTable,
} from '../src/compat/editor';

const pkg = JSON.parse(
  readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'),
) as { version: string };

describe('包骨架', () => {
  it('全部入口可独立导入且版本与 package.json 一致', () => {
    const versions = [
      contentVersion,
      markdownVersion,
      tiptapVersion,
      collabVersion,
      compatVersion,
    ];
    expect(new Set(versions).size).toBe(1);
    expect(versions[0]).toBe(pkg.version);
  });

  it('/editor 过渡别名指向同一份 /tiptap 实现', () => {
    expect(CompatResizableTable).toBe(ResizableTable);
  });
});
