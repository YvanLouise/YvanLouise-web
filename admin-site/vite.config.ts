import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { localLauncherPlugin } from "../scripts/local-launcher-plugin";

const sharedSrc = fileURLToPath(new URL("../shared/src", import.meta.url));
const contentDir = fileURLToPath(new URL("../content", import.meta.url));
const sharedPublicDir = fileURLToPath(new URL("../content/public", import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react(), localLauncherPlugin("admin-site", contentDir.replace(/[\\/]content[\\/]?$/, ""), env.VITE_API_BASE_URL?.trim() || "http://localhost:4000")],
    define: {
      "import.meta.env.VITE_API_BASE_URL": JSON.stringify(env.VITE_API_BASE_URL?.trim() || "http://localhost:4000"),
      "import.meta.env.VITE_SITE_RUNTIME": JSON.stringify("admin")
    },
    resolve: {
      alias: {
        "@shared": sharedSrc,
        "@content": contentDir
      }
    },
    publicDir: sharedPublicDir,
    base: env.VITE_BASE_PATH || "/",
    server: {
      host: "127.0.0.1",
      port: 5174,
      strictPort: true,
      watch: {
        // Local admin saves write to the shared content snapshot.
        // Ignore that file so Vite doesn't hard-reload the whole admin app after every save.
        ignored: ["**/content/site-content.json"]
      }
    },
    preview: {
      host: "127.0.0.1",
      port: 4174,
      strictPort: true
    }
  };
});
