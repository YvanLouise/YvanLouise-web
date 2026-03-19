import { Pool } from "pg";
import { config } from "../config.js";
import { MemorySiteStore } from "./memoryStore.js";
import { PostgresSiteStore } from "./postgresStore.js";
import { SiteStore } from "./types.js";

let storeInstance: SiteStore | null = null;

export function getStore(): SiteStore {
  if (storeInstance) {
    return storeInstance;
  }

  if (config.databaseUrl) {
    const pool = new Pool({ connectionString: config.databaseUrl });
    storeInstance = new PostgresSiteStore(pool);
    return storeInstance;
  }

  if (config.isProduction) {
    throw new Error("Production mode requires DATABASE_URL. Refusing to start with the local JSON store.");
  }

  storeInstance = new MemorySiteStore();
  return storeInstance;
}
