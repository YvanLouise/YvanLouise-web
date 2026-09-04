import test from "node:test";
import assert from "node:assert/strict";
import { displayWorkDate, isWorkDetail, relatedWorks, safeWorkLink, workGallerySources, workListReturnTo } from "../shared/src/lib/workDetail";
import { sampleWorks } from "../shared/src/data/sampleData";

test("detail data rejects malformed fields before rendering", () => {
  assert.equal(isWorkDetail(sampleWorks[0]), true);
  for (const value of [null, {}, { ...sampleWorks[0], galleryImages: [null] }, { ...sampleWorks[0], detailSections: [null] }, { ...sampleWorks[0], featureList: "invalid" }, { ...sampleWorks[0], demoUrl: {} }]) assert.equal(isWorkDetail(value), false);
});

test("detail links accept public HTTP destinations and reject executable or credential URLs", () => {
  assert.equal(safeWorkLink(" https://example.com/demo "), "https://example.com/demo");
  for (const value of ["javascript:alert(1)", "data:text/html,a", "https://user:secret@example.com", "/admin", "bad", ""]) assert.equal(safeWorkLink(value), undefined);
});

test("gallery filters invalid sources and deduplicates without changing source data", () => {
  const work = { ...sampleWorks[0], coverUrl: "uploads/cover.png", galleryImages: ["uploads/cover.png", " https://example.com/a.png ", "javascript:alert(1)", "", "/uploads/b.png"] };
  assert.deepEqual(workGallerySources(work), ["uploads/cover.png", "https://example.com/a.png", "/uploads/b.png"]);
  assert.equal(work.galleryImages.length, 5);
});

test("related works prioritize category, exclude current work and do not reorder source", () => {
  const current = { ...sampleWorks[0], id: "current", type: "software" as const };
  const works = [current, { ...current, id: "different", type: "music" as const, publishedAt: "2026-09-01" }, { ...current, id: "same", publishedAt: "2025-01-01" }];
  assert.deepEqual(relatedWorks(works, current).map(work => work.id), ["same", "different"]);
  assert.equal(works[1].id, "different");
  assert.equal(relatedWorks(works, current, 1).length, 1);
});

test("detail return links preserve list filters without accepting unrelated redirects", () => {
  assert.equal(workListReturnTo("/works?type=game&q=test"), "/works?type=game&q=test");
  for (const value of [null, "//example.com", "/works/another", "/admin", "javascript:alert(1)"]) assert.equal(workListReturnTo(value), "/works");
});

test("publication dates render consistently and invalid dates stay hidden", () => {
  assert.equal(displayWorkDate("2024-02-29"), "2024年2月29日");
  for (const value of ["2025-02-29", "2025-13-01", "bad", ""]) assert.equal(displayWorkDate(value), null);
});
