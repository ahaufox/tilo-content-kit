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
    // 过渡别名：./editor → ./tiptap，1.0 移除
    'compat-editor': 'src/compat/editor.ts',
  },
  format: ['esm', 'cjs'],
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
