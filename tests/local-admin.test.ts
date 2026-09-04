import test from "node:test";
import assert from "node:assert/strict";
import express, { type Request, type Response } from "express";
import { createLocalAdminGuard, isLoopbackOrigin } from "../backend/src/middleware/localAdmin";
import { createAdminRouter } from "../backend/src/routes/admin";
import { requireAdmin } from "../backend/src/middleware/auth";
import { config } from "../backend/src/config";
import type { SiteStore } from "../backend/src/store/types";

function checkGuard(headers: Record<string, string> = {}, address = "127.0.0.1", method = "GET", json = true): number {
  let result = 0;
  const req = { method, socket: { remoteAddress: address }, get: (name: string) => ({ host: "localhost:4000", origin: "http://localhost:5174", ...headers })[name], is: () => json } as unknown as Request;
  const res = { status(code: number) { result = code; return this; }, json() {} } as unknown as Response;
  createLocalAdminGuard()(req, res, () => { result = 200; });
  return result;
}

test("local admin accepts trusted loopback requests without cookies", () => {
  assert.equal(checkGuard(), 200);
  assert.equal(checkGuard({}, "::1"), 200);
  assert.equal(checkGuard({}, "::ffff:127.0.0.1", "PUT"), 200);
  assert.equal(checkGuard({ origin: "" }), 200);
  assert.equal(isLoopbackOrigin("http://localhost:5174"), true);
});

test("local admin rejects remote peers, rebinding hosts, foreign origins and form posts", () => {
  assert.equal(checkGuard({ "x-forwarded-for": "127.0.0.1" }, "192.168.1.2"), 403);
  for (const host of ["attacker.test:4000", "localhost.attacker.test:4000", "localhost:4000@attacker.test", "localhost:4000/path"]) assert.equal(checkGuard({ host }), 403);
  for (const origin of ["https://attacker.test", "null", "http://localhost:9999", "http://localhost:5174.attacker.test"]) assert.equal(checkGuard({ origin }), 403);
  assert.equal(checkGuard({ origin: "", "sec-fetch-site": "cross-site" }), 403);
  assert.equal(checkGuard({}, "127.0.0.1", "POST", false), 415);
  assert.equal(isLoopbackOrigin("http://localhost:5174/"), false);
});

test("legacy production mode still requires authentication", () => {
  const previous = config.localAdminMode;
  let status = 0;
  try {
    config.localAdminMode = false;
    requireAdmin({ cookies: {} } as Request, { status(code: number) { status = code; return this; }, json() {} } as unknown as Response, () => assert.fail("Unauthenticated production access"));
    assert.equal(status, 401);
  } finally { config.localAdminMode = previous; }
});

test("admin HTTP routes support passwordless reads and writes without touching real content", async () => {
  const previous = config.localAdminMode;
  config.localAdminMode = true;
  const works: Array<{ id: string; title: string }> = [];
  const store = {
    getWorks: async () => works,
    createWork: async (input: { title: string }) => { const work = { id: "qa-local-work", title: input.title }; works.push(work); return work; },
    deleteWork: async (id: string) => { const index = works.findIndex((work) => work.id === id); if (index < 0) return false; works.splice(index, 1); return true; },
    getAdminByUsername: async () => assert.fail("Local mode must not look up accounts")
  } as unknown as SiteStore;
  const app = express();
  app.use(express.json());
  app.use("/api/admin", createAdminRouter(store));
  const server = app.listen(0, "127.0.0.1");
  try {
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const base = `http://127.0.0.1:${address.port}/api/admin`;
    const headers = { Origin: "http://localhost:5174", "Content-Type": "application/json" };
    assert.equal((await fetch(`${base}/works`, { headers })).status, 200);
    const created = await fetch(`${base}/works`, { method: "POST", headers, body: JSON.stringify({ title: "Local QA" }) });
    assert.equal(created.status, 201);
    assert.equal(created.headers.get("set-cookie"), null);
    assert.equal(works.length, 1);
    assert.equal((await fetch(`${base}/works/qa-local-work`, { method: "DELETE", headers })).status, 204);
    assert.equal(works.length, 0);
    const foreign = await fetch(`${base}/works`, { method: "POST", headers: { ...headers, Origin: "https://attacker.test" }, body: JSON.stringify({ title: "Denied" }) });
    assert.equal(foreign.status, 403);
    assert.equal(works.length, 0);
  } finally {
    config.localAdminMode = previous;
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
