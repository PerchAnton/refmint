import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "node:path";
const pages = [
  "vueform",
  "autoform",
  "formwerk",
  "formly",
  "jsonforms-react",
  "jsonforms-vue",
  "jsonforms-angular",
  "jedison",
];
export default defineConfig({
  plugins: [vue()],
  optimizeDeps: { include: ["@vueform/vueform", "wnumb", "lodash", "axios"] },
  esbuild: {
    jsx: "automatic",
    tsconfigRaw: {
      compilerOptions: {
        experimentalDecorators: true,
        useDefineForClassFields: false,
      },
    },
  },
  server: { host: "127.0.0.1" },
  build: {
    rollupOptions: {
      input: Object.fromEntries(
        pages.map((p) => [p, resolve(p, "index.html")]),
      ),
    },
  },
});
