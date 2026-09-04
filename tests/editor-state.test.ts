import test from "node:test";
import assert from "node:assert/strict";
import { filterAdminWorks, mergeSaved, parseSocialLinksText, parseUiText, parseWorkText, workTextFields } from "../admin-site/src/lib/editorState";
import { sampleSettings, sampleWorks } from "../shared/src/data/sampleData";

test("work multiline drafts preserve lines and reject incomplete sections at save", () => {
  const text = { ...workTextFields({}), featureList: "First\n\nSecond\n", detailSections: "Title\nBody\nMore\n\nOther\nText" };
  assert.deepEqual(parseWorkText(text).featureList, ["First", "Second"]);
  assert.equal(text.featureList, "First\n\nSecond\n");
  assert.deepEqual(parseWorkText(text).detailSections, [{ title: "Title", body: "Body\nMore" }, { title: "Other", body: "Text" }]);
  assert.throws(() => parseWorkText({ ...text, detailSections: "Title only" }), /缺少正文/);
  assert.throws(() => parseWorkText({ ...text, galleryImages: Array(21).fill("uploads/a.png").join("\n") }), /20/);
});

test("partial saves update baseline fields without overwriting other drafts", () => {
  const original = { title: "old", image: "a", nested: { value: "old" } };
  const draft = { ...original, title: "typing", nested: { value: "draft" } };
  const saved = { ...original, image: "b", nested: { value: "server" } };
  assert.deepEqual(mergeSaved(draft, original, saved), { title: "typing", image: "b", nested: { value: "draft" } });
  assert.equal(draft.image, "a");
});

test("UI text validation rejects valid JSON with invalid application shapes", () => {
  assert.deepEqual(parseUiText(JSON.stringify(sampleSettings.uiText), sampleSettings.uiText), sampleSettings.uiText);
  for (const value of ["null", "[]", "42", "{}", "{bad}"]) assert.throws(() => parseUiText(value, sampleSettings.uiText));
  assert.throws(() => parseUiText(JSON.stringify({ ...sampleSettings.uiText, nav: "wrong" }), sampleSettings.uiText), /nav/);
});

test("social links preserve URL delimiters and reject incomplete lines only on save", () => {
  assert.deepEqual(parseSocialLinksText("Label|https://example.com/a|b", true), [{ label: "Label", url: "https://example.com/a|b" }]);
  assert.deepEqual(parseSocialLinksText("Typing"), []);
  assert.throws(() => parseSocialLinksText("Typing", true), /第 1 行/);
  assert.throws(() => parseSocialLinksText("Label|javascript:alert(1)", true), /不完整/);
});

test("admin search combines terms, type and sort without changing source order", () => {
  const works = sampleWorks.map((work, index) => ({ ...work, title: `Project ${index}`, summary: "Fast editor", type: index ? "game" as const : "software" as const }));
  const before = JSON.stringify(works);
  assert.equal(filterAdminWorks(works, "PROJECT fast", "software", "date").length, 1);
  assert.equal(filterAdminWorks(works, "no-match", "all", "title").length, 0);
  assert.equal(JSON.stringify(works), before);
});
