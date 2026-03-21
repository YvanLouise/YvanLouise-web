import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

const sharedSrc = fileURLToPath(new URL("../shared/src", import.meta.url));
const contentDir = fileURLToPath(new URL("../content", import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@shared": sharedSrc,
        "@content": contentDir
      }
    },
    base: env.VITE_BASE_PATH || "/",
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
