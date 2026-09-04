import type { Plugin } from "vite";

export function localLauncherPlugin(service: string, workspace: string, apiBase = ""): Plugin {
  return {
    name: "local-launcher-identity",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/__local-launcher", (_req, res) => {
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Cache-Control", "no-store");
        res.end(JSON.stringify({ service, workspace, apiBase, localAdmin: true, protocol: 1 }));
      });
    }
  };
}
