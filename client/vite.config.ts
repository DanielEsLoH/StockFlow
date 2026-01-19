import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { visualizer } from "rollup-plugin-visualizer";
import compression from "vite-plugin-compression";

const isAnalyze = process.env.ANALYZE === "true";

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
    // Hidden source maps for production debugging without exposing to users
    sourcemap: "hidden",

    rollupOptions: {
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

          // Let Vite handle chunking for React-dependent libraries:
          // - react-router, @react-router
          // - @radix-ui
          // - framer-motion
          // - recharts
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
