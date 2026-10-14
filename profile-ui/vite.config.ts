import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["favicon.svg", "social-preview.svg", "robots.txt"],
      manifest: false, // Using manual manifest.webmanifest
      workbox: {
        globPatterns: ["**/*.{js,css,html,woff,woff2,svg}"],
        runtimeCaching: [
          {
            urlPattern: /^\/api\/site$/,
            handler: "NetworkFirst",
            options: {
              cacheName: "site-content",
              expiration: { maxEntries: 1, maxAgeSeconds: 86400 },
              networkTimeoutSeconds: 5,
            },
          },
          {
            urlPattern: /^\/api\/(resume|contact|me)/,
            handler: "NetworkOnly",
          },
        ],
        navigateFallback: "index.html",
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
  server: {
    port: 5173,
    strictPort: true,
    proxy: { "/api": process.env.VITE_API_URL || "http://127.0.0.1:8080" },
    fs: { deny: [".env", ".env.*", "*.{crt,pem}", "**/.git/**", "**/private/**"] },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            id.includes("/node_modules/react/") ||
            id.includes("/node_modules/react-dom/") ||
            id.includes("/node_modules/react-router-dom/")
          )
            return "vendor-react";
          if (id.includes("/node_modules/@auth0/auth0-react/"))
            return "vendor-auth";
          if (
            id.includes("/node_modules/react-hook-form/") ||
            id.includes("/node_modules/zod/") ||
            id.includes("/node_modules/@hookform/resolvers/")
          )
            return "vendor-form";
          if (id.includes("/node_modules/framer-motion/"))
            return "vendor-motion";
          if (id.includes("/node_modules/@tanstack/react-query/"))
            return "vendor-query";
        },
      },
    },
    chunkSizeWarningLimit: 500,
  },
});
