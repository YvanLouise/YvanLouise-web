import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

const sharedSrc = fileURLToPath(new URL("../shared/src", import.meta.url));
const contentDir = fileURLToPath(new URL("../content", import.meta.url));
const sharedPublicDir = fileURLToPath(new URL("../content/public", import.meta.url));

export default defineConfig(({ mode }) => {
  loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@shared": sharedSrc,
        "@content": contentDir
      }
    },
    publicDir: sharedPublicDir,
    base: "./",
    build: {
      cssCodeSplit: false,
      rollupOptions: {
        output: {
          entryFileNames: "assets/public-site.js",
          chunkFileNames: "assets/[name].js",
          assetFileNames: (assetInfo) => {
            if (assetInfo.name?.endsWith(".css")) {
              return "assets/public-site.css";
            }

            return "assets/[name][extname]";
          }
        }
      }
    },
    server: {
      host: "0.0.0.0",
      port: 5173,
      strictPort: true
    },
    preview: {
      host: "0.0.0.0",
      port: 4173,
      strictPort: true
    }
  };
});
