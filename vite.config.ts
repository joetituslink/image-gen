import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
      "/images": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
  plugins: [react()],
  publicDir: false,
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: process.env.VITE_BUILD_TO_ROOT === "true" ? "." : "dist",
    emptyOutDir: process.env.VITE_BUILD_TO_ROOT === "true" ? false : true,
    assetsDir: "",
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          if (
            assetInfo.name &&
            (assetInfo.name.endsWith(".ico") ||
              assetInfo.name.endsWith(".svg") ||
              assetInfo.name.endsWith(".txt"))
          ) {
            return "[name][extname]"; // Keep original names for static assets if they are processed by vite
          }
          return "[name]-[hash][extname]";
        },
        chunkFileNames: "[name]-[hash].js",
        entryFileNames: "[name]-[hash].js",
      },
    },
  },
}));
