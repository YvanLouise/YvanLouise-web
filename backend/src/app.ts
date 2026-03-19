import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { config } from "./config.js";
import { isLocalAssetStorage } from "./lib/assetStorage.js";
import { getUploadsDir } from "./lib/uploads.js";
import { errorHandler, notFoundHandler } from "./middleware/error.js";
import { createAdminRouter } from "./routes/admin.js";
import { createPublicRouter } from "./routes/public.js";
import { getStore } from "./store/index.js";

function resolveAllowedOrigin(origin: string | undefined): string | null {
  if (!origin) {
    return config.corsOrigins[0] ?? null;
  }

  return config.corsOrigins.includes(origin) ? origin : null;
}

export function createApp() {
  const app = express();
  const store = getStore();

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" }
    })
  );
  app.use(
    cors({
      origin: (origin, callback) => {
        const allowedOrigin = resolveAllowedOrigin(origin ?? undefined);
        if (!origin || allowedOrigin) {
          callback(null, allowedOrigin ?? true);
          return;
        }

        callback(new Error("Not allowed by CORS"));
      },
      credentials: true
    })
  );
  app.use(express.json({ limit: "110mb" }));
  app.use(cookieParser());

  if (isLocalAssetStorage()) {
    app.use("/uploads", (req, res, next) => {
      const allowedOrigin = resolveAllowedOrigin(req.headers.origin);
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      if (allowedOrigin) {
        res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
        res.setHeader("Vary", "Origin");
      }
      next();
    });
    app.use("/uploads", express.static(getUploadsDir()));
  }

  app.get("/api/health", (_req, res) => {
    res.json({
      ok: true,
      at: new Date().toISOString(),
      env: config.nodeEnv,
      storage: config.assetStorageMode
    });
  });

  app.use("/api", createPublicRouter(store));
  app.use("/api/admin", createAdminRouter(store));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
