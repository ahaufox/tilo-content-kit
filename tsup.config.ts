import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    content: 'src/content/index.ts',
    convert: 'src/convert/index.ts',
    legal: 'src/legal/index.ts',
    markdown: 'src/markdown/index.ts',
    tiptap: 'src/tiptap/index.ts',
    collab: 'src/collab/index.ts',
    theme: 'src/theme/index.ts',
    // 双入口支持：./editor 与 ./tiptap 均导出 RichEditor 与 EditorToolbar
    'compat-editor': 'src/compat/editor.ts',
  },
  format: ['esm', 'cjs'],
  external: [
    'react',
    'react-dom',
    '@tiptap/core',
    '@tiptap/react',
    '@tiptap/starter-kit',
    '@tiptap/extension-color',
    '@tiptap/extension-highlight',
    '@tiptap/extension-placeholder',
    '@tiptap/extension-table',
    '@tiptap/extension-table-row',
    '@tiptap/extension-text-align',
    '@tiptap/extension-text-style',
    '@tiptap/y-tiptap',
    'react-markdown',
    'remark-gfm',
    'yjs',
    'y-websocket',
    'prosemirror-model',
    'prosemirror-state',
    'prosemirror-tables',
  ],
  esbuildOptions(options) {
    options.jsx = 'automatic';
  },
  dts: true,
  clean: true,
  sourcemap: true,
  // 跨入口共享实现（internal/*）抽为公共 chunk，避免消费方同时使用时出现两份实例
  splitting: true,
  treeshake: true,
  cjsInterop: true,
  outDir: 'dist',
  onSuccess: 'cp src/styles/index.css dist/styles.css',
});
