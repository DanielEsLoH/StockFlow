import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { visualizer } from "rollup-plugin-visualizer";
import compression from "vite-plugin-compression";
import { VitePWA } from "vite-plugin-pwa";

const isAnalyze = process.env.ANALYZE === "true";
const isProduction = process.env.NODE_ENV === "production";

export default defineConfig({
  plugins: [
    tailwindcss(),
    reactRouter(),
    tsconfigPaths(),

    // Gzip compression
    compression({
      algorithm: "gzip",
      ext: ".gz",
      threshold: 1024,
    }),

    // Brotli compression
    compression({
      algorithm: "brotliCompress",
      ext: ".br",
      threshold: 1024,
    }),

    // PWA support
    VitePWA({
      registerType: "prompt",
      injectRegister: null,
      manifest: {
        name: "StockFlow",
        short_name: "StockFlow",
        description:
          "Plataforma de gestión de inventario y facturación electrónica",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#6366F1",
        orientation: "portrait-primary",
        categories: ["business", "finance", "productivity"],
        icons: [
          {
            src: "/favicon.svg",
            sizes: "any",
            type: "image/svg+xml",
          },
          {
            src: "/favicon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/favicon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/favicon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
        shortcuts: [
          {
            name: "Nueva Factura",
            short_name: "Factura",
            url: "/invoices/new",
            icons: [{ src: "/favicon-192.png", sizes: "192x192" }],
          },
          {
            name: "Punto de Venta",
            short_name: "POS",
            url: "/pos",
            icons: [{ src: "/favicon-192.png", sizes: "192x192" }],
          },
          {
            name: "Productos",
            short_name: "Productos",
            url: "/products",
            icons: [{ src: "/favicon-192.png", sizes: "192x192" }],
          },
        ],
      },
      workbox: {
        // Precache app shell
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
        // Runtime caching strategies
        runtimeCaching: [
          {
            // API calls — network first with cache fallback
            urlPattern: /^https?:\/\/.*\/api\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24, // 24 hours
              },
              networkTimeoutSeconds: 10,
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Google Fonts stylesheets — stale while revalidate
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "google-fonts-stylesheets",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
            },
          },
          {
            // Google Fonts files — cache first (immutable)
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-webfonts",
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Static assets — cache first
            urlPattern: /\.(?:png|jpg|jpeg|gif|svg|ico|webp)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "static-assets",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
        ],
      },
    }),

    // Bundle analysis (conditional on ANALYZE env var)
    isAnalyze &&
      visualizer({
        filename: "stats.html",
        open: true,
        gzipSize: true,
        brotliSize: true,
      }),
  ].filter(Boolean),

  build: {
    // Disable source maps in production to prevent exposing server code
    // Enable source maps in development for debugging
    sourcemap: isProduction ? false : true,

    rollupOptions: {
      onwarn(warning, warn) {
        // Suppress sourcemap warnings from node_modules (harmless third-party package warnings)
        if (
          warning.code === "SOURCEMAP_ERROR" &&
          warning.loc?.file?.includes("node_modules")
        ) {
          return;
        }
        warn(warning);
      },
      output: {
        // Manual chunk splitting for optimal caching
        // Note: Libraries with React peer dependencies must be in the same chunk
        // or loaded after React to avoid "Cannot read properties of undefined" errors
        manualChunks: (id) => {
          // React ecosystem - keep together to ensure proper load order
          if (
            id.includes("node_modules/react-dom") ||
            id.includes("node_modules/react/") ||
            id.includes("node_modules/scheduler")
          ) {
            return "vendor-react";
          }

          // Date utilities (no React dependency)
          if (id.includes("node_modules/date-fns")) {
            return "vendor-date";
          }

          // Zod (no React dependency)
          if (id.includes("node_modules/zod")) {
            return "vendor-zod";
          }

          // Recharts + D3 (~200KB) - only used in Dashboard and reports
          if (
            id.includes("node_modules/recharts") ||
            id.includes("node_modules/d3-")
          ) {
            return "vendor-charts";
          }

          // Let Vite handle chunking for React-dependent libraries:
          // - react-router, @react-router
          // - @radix-ui
          // - framer-motion
          // - @tanstack/react-query
          // - react-hook-form
        },
      },
    },

    // Remove console and debugger statements in production
    minify: "esbuild",
  },

  esbuild: {
    // Remove console.log and debugger in production builds
    drop: process.env.NODE_ENV === "production" ? ["console", "debugger"] : [],
  },

  server: {
    // Warmup files for faster cold starts in development
    warmup: {
      clientFiles: [
        "./app/root.tsx",
        "./app/routes.ts",
        "./app/routes/**/*.tsx",
      ],
    },
  },
});
