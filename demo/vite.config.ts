import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages 项目站点挂在 https://ahaufox.github.io/tilo-content-kit/ 子路径下，
// CI 构建时通过 VITE_PAGES_BASE 注入；本地开发默认根路径。
export default defineConfig({
  base: process.env.VITE_PAGES_BASE || '/',
  plugins: [react()],
});
