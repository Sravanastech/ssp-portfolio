import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import type { Plugin } from "vite";

/**
 * Preloads the Latin 400 and 700 Space Grotesk woff2 files. Fontsource names them
 * with a content hash at build time, so the URLs are read from the emitted bundle.
 */
function preloadLatinFonts(): Plugin {
  const latinWeights = [
    /space-grotesk-latin-400-normal[^/]*\.woff2$/,
    /space-grotesk-latin-700-normal[^/]*\.woff2$/,
  ];
  return {
    name: "preload-latin-space-grotesk",
    transformIndexHtml: {
      order: "post",
      handler(_html, ctx) {
        if (!ctx.bundle) return;
        const tags = Object.keys(ctx.bundle)
          .filter((file) => latinWeights.some((re) => re.test(file)))
          .map((file) => ({
            tag: "link",
            injectTo: "head" as const,
            attrs: {
              rel: "preload",
              as: "font",
              type: "font/woff2",
              crossorigin: true,
              href: `/${file}`,
            },
          }));
        return tags;
      },
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Java backend dev target. Single variable: VITE_API_URL (default matches profile-backend, port 8080).
  const apiTarget =
    loadEnv(mode, process.cwd(), "").VITE_API_URL || "http://127.0.0.1:8080";
  return {
    plugins: [
      react(),
      tailwindcss(),
      preloadLatinFonts(),
      VitePWA({
        registerType: "prompt",
        includeAssets: [
          "favicon.svg",
          "icons/*.png",
          "social-preview.svg",
          "robots.txt",
        ],
        manifest: false, // Using manual manifest.webmanifest
        workbox: {
          globPatterns: ["**/*.{js,css,html,woff2,svg}"],
          // The resume needs a signed-in network fetch anyway; do not precache pdf.js.
          globIgnores: ["**/vendor-pdfjs-*.js"],
          runtimeCaching: [
            {
              urlPattern: ({ url }: { url: URL }) =>
                url.pathname === "/api/site",
              handler: "NetworkFirst",
              options: {
                cacheName: "site-content",
                expiration: { maxEntries: 1, maxAgeSeconds: 86400 },
                networkTimeoutSeconds: 5,
              },
            },
            // Workbox matches the full request; use pathname matchers.
            // Private/authenticated API data must never be cached.
            {
              urlPattern: ({ url }: { url: URL }) =>
                url.pathname === "/api/resume" ||
                url.pathname === "/api/me" ||
                url.pathname.startsWith("/api/admin"),
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
      proxy: { "/api": apiTarget },
      fs: {
        // The studio imports the backend's page-text label map (single source of truth).
        allow: [
          path.resolve(__dirname),
          path.resolve(
            __dirname,
            "../profile-backend/src/main/resources/content-schema",
          ),
        ],
        deny: [".env", ".env.*", "*.{crt,pem}", "**/.git/**", "**/private/**"],
      },
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "@content-schema": path.resolve(
          __dirname,
          "../profile-backend/src/main/resources/content-schema",
        ),
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
            // pdf.js is only reachable from the lazy resume route.
            if (id.includes("/node_modules/pdfjs-dist/")) return "vendor-pdfjs";
            // Auth0 and form libraries stay in their lazy route chunks so the home page never preloads them.
            if (id.includes("/node_modules/@tanstack/react-query/"))
              return "vendor-query";
          },
        },
      },
      chunkSizeWarningLimit: 500,
    },
  };
});
