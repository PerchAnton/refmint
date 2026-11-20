import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  resolve: { alias: {
    react: fileURLToPath(new URL('node_modules/react', import.meta.url)),
    'react-dom': fileURLToPath(new URL('node_modules/react-dom', import.meta.url)),
  } },
  esbuild: { jsx: 'automatic' },
  server: {
    fs: { allow: ['..'] },
    proxy: { '/api': 'http://127.0.0.1:5187', '/shared/style.css': 'http://127.0.0.1:5187' },
  },
});
