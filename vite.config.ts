import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const base = process.env.VITE_BASE_PATH ?? "/";

const viteAssetQueryOptimizerPlugin = {
  name: "vite-asset-query-imports",
  setup(build) {
    build.onResolve({ filter: /\?(worker|url)(?:&.*)?$/ }, ({ path }) => ({
      path,
      external: true,
    }));
  },
};

export default defineConfig({
  base,
  plugins: [react()],
  optimizeDeps: {
    esbuildOptions: {
      plugins: [viteAssetQueryOptimizerPlugin],
    },
  },
  resolve: {
    alias: {
      path: new URL("./src/pathBrowser.ts", import.meta.url).pathname,
    },
    dedupe: [
      "monaco-editor",
      "monaco-editor-textmate",
      "monaco-textmate",
      "onigasm",
      "react",
      "react-dom",
    ],
  },
  server: {
    fs: {
      allow: [".."],
    },
  },
});
