import { build } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

await build({
  configFile: false,
  plugins: [react()],
  resolve: { alias: { "@": resolve("src") } },
  ssr: { noExternal: true },
  build: {
    ssr: resolve("src/entry-prerender.tsx"),
    outDir: resolve("dist/renderer"),
    emptyOutDir: true,
    rollupOptions: { output: { entryFileNames: "prerender.mjs" } },
  },
});
