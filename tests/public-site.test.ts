import test from "node:test";
import assert from "node:assert/strict";
import { filterWorks, parseWorkFilter } from "../shared/src/lib/workSearch";
import { clipBounds, ensureAudioReady } from "../shared/src/lib/audioPlayback";
import { requestJson } from "../shared/src/lib/requestJson";
import { readCachedWorks, readCachedSiteSettings, readCachedPage } from "../shared/src/lib/siteCache";
import { sampleWorks, sampleSettings } from "../shared/src/data/sampleData";
import { normalizePublicPath } from "../backend/src/lib/publicPaths";

test("publisher accepts only normalized public files and rejects traversal/pathspecs", () => {
  assert.equal(normalizePublicPath("./content/site-content.json"), "content/site-content.json");
  assert.equal(normalizePublicPath("content\\public\\uploads\\song.flac"), "content/public/uploads/song.flac");
  for (const path of ["backend/data/local-store.json", "content/public/uploads/../../../backend/data/local-store.json", "/content/site-content.json", "content/public/uploads/*", "content/public/uploads/../../.env", "C:/secret", ""]) {
    assert.equal(normalizePublicPath(path), null, path);
  }
});

test("search handles multiple terms and does not reorder source data", () => {
  const source = [{ ...sampleWorks[0], title: "Alpha Studio", summary: "Music tools", publishedAt: "2025-01-01" }, { ...sampleWorks[0], title: "Beta", publishedAt: "2026-01-01" }];
  assert.equal(filterWorks(source, "all", " ALPHA tools ", "newest").length, 1);
  assert.equal(filterWorks(source, "all", "", "newest")[0].title, "Beta");
  assert.equal(source[0].title, "Alpha Studio");
  assert.equal(filterWorks(source, "all", "nothing-matches", "title").length, 0);
  assert.equal(parseWorkFilter("invalid"), "all");
  assert.equal(parseWorkFilter("music"), "music");
});

test("clip bounds reject invalid and out-of-range intervals", () => {
  assert.deepEqual(clipBounds(-1, 40, 30), { start: 0, end: 30 });
  for (const values of [[30, 40, 30], [5, 2, 30], [0, 30, Infinity], [NaN, 30, 40]]) {
    assert.throws(() => clipBounds(...values as [number, number, number]));
  }
});

class FakeAudio extends EventTarget {
  src = "";
  readyState = 0;
  error = null;
  loads = 0;
  getAttribute(): string { return this.src; }
  load(): void { this.loads++; }
}
test("audio loading can be cancelled and retried without duplicate loads", async () => {
  const audio = new FakeAudio();
  const controller = new AbortController();
  const loading = ensureAudioReady(audio as unknown as HTMLAudioElement, "/track.flac", controller.signal);
  controller.abort();
  await assert.rejects(loading, { name: "AbortError" });
  const ready = ensureAudioReady(audio as unknown as HTMLAudioElement, "/track.flac", new AbortController().signal);
  audio.dispatchEvent(new Event("loadedmetadata"));
  await ready;
  assert.equal(audio.loads, 1);
});
test("audio loading times out and surfaces source errors", async () => {
  const audio = new FakeAudio();
  await assert.rejects(ensureAudioReady(audio as unknown as HTMLAudioElement, "/track", new AbortController().signal, 5), /超时/);
  const loading = ensureAudioReady(audio as unknown as HTMLAudioElement, "/track", new AbortController().signal);
  audio.dispatchEvent(new Event("error"));
  await assert.rejects(loading, /加载失败/);
});

test("JSON requests preserve headers, avoid GET content-type, handle 204 and errors", async (t) => {
  let captured: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (_url: unknown, options: RequestInit) => { captured = options; return new Response('{"ok":true}'); });
  assert.deepEqual(await requestJson("/test", { headers: new Headers({ "X-Test": "yes" }) }), { ok: true });
  assert.equal(new Headers(captured?.headers).get("X-Test"), "yes");
  assert.equal(new Headers(captured?.headers).has("Content-Type"), false);
  t.mock.method(globalThis, "fetch", async () => new Response(null, { status: 204 }));
  assert.equal(await requestJson("/test"), undefined);
  t.mock.method(globalThis, "fetch", async () => new Response("<html>bad gateway</html>", { status: 502 }));
  await assert.rejects(requestJson("/test"), /502/);
});
test("JSON request timeout and external cancellation release pending fetches", async (t) => {
  t.mock.method(globalThis, "fetch", (_url: unknown, options: RequestInit) => new Promise((_resolve, reject) => {
    if (options.signal?.aborted) reject(options.signal.reason);
    else options.signal?.addEventListener("abort", () => reject(options.signal?.reason), { once: true });
  }));
  await assert.rejects(requestJson("/test", {}, 5), /超时/);
  const controller = new AbortController();
  const request = requestJson("/test", { signal: controller.signal });
  controller.abort();
  await assert.rejects(request, { name: "AbortError" });
});

test("storage access denial and invalid cached shapes cannot crash a page", () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
  try {
    Object.defineProperty(globalThis, "window", { configurable: true, value: { get localStorage() { throw new Error("SecurityError"); } } });
    assert.equal(readCachedWorks(), null);
    assert.equal(readCachedSiteSettings(), null);
    let raw = "{}";
    Object.defineProperty(globalThis, "window", { configurable: true, value: { localStorage: { getItem: () => raw, removeItem() {} } } });
    assert.equal(readCachedWorks(), null);
    assert.equal(readCachedSiteSettings(), null);
    assert.equal(readCachedPage("__proto__"), null);
    raw = JSON.stringify(sampleWorks);
    assert.deepEqual(readCachedWorks(), sampleWorks);
    raw = JSON.stringify(sampleSettings);
    assert.deepEqual(readCachedSiteSettings(), sampleSettings);
    raw = "{broken";
    assert.equal(readCachedWorks(), null);
  } finally {
    if (previous) Object.defineProperty(globalThis, "window", previous);
    else Reflect.deleteProperty(globalThis, "window");
  }
});
