import { defineConfig, loadEnv, Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";

const sharedSrc = fileURLToPath(new URL("../shared/src", import.meta.url));
const contentDir = fileURLToPath(new URL("../content", import.meta.url));
const sharedPublicDir = fileURLToPath(new URL("../content/public", import.meta.url));
const appPublicDir = fileURLToPath(new URL("./public", import.meta.url));

function copyAppPublicFiles(repoBase: string, assetBase: string): Plugin {
  return {
    name: "copy-app-public-files",
    transformIndexHtml(html) {
      return html.replaceAll("__REPOSITORY_BASE__", repoBase).replaceAll("__ASSET_BASE__", assetBase);
    },
    closeBundle() {
      if (!fs.existsSync(appPublicDir)) {
        return;
      }

      const outDir = path.resolve(process.cwd(), "dist");
      fs.cpSync(appPublicDir, outDir, { recursive: true, force: true });
      const notFoundPath = path.join(outDir, "404.html");
      fs.writeFileSync(notFoundPath, fs.readFileSync(notFoundPath, "utf8").replaceAll("__REPOSITORY_BASE__", repoBase));
    }
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const repoBase = (env.VITE_REPOSITORY_BASE || "/YvanLouise-web/").replace(/[^a-zA-Z0-9_./-]/g, "");
  const assetBase = (env.VITE_BASE_PATH || "/").replace(/[^a-zA-Z0-9_./-]/g, "");

  return {
    plugins: [react(), copyAppPublicFiles(repoBase, assetBase)],
    define: mode === "production" ? {
      "import.meta.env.VITE_API_BASE_URL": JSON.stringify(""),
      "import.meta.env.VITE_SITE_RUNTIME": JSON.stringify("public")
    } : {},
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
          entryFileNames: "assets/public-site-[hash].js",
          chunkFileNames: "assets/[name]-[hash].js",
          assetFileNames: (assetInfo) => {
            if (assetInfo.name?.endsWith(".css")) {
              return "assets/public-site-[hash].css";
            }

            return "assets/[name]-[hash][extname]";
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
