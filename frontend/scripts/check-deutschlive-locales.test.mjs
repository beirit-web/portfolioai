import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

function leaves(value, prefix = "") {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return [prefix];
  return Object.entries(value).flatMap(([key, child]) => leaves(child, `${prefix}.${key}`));
}

test("each independently loaded DeutschLive dictionary provides every UI key", () => {
  const read = locale => JSON.parse(fs.readFileSync(new URL(`../../apps/deutsch-live/src/i18n/${locale}.json`, import.meta.url), "utf8"));
  const expected = leaves(read("ru")).sort();
  for (const locale of ["de", "uk"]) {
    const actual = new Set(leaves(read(locale)));
    assert.deepEqual(expected.filter(key => !actual.has(key)), [], `${locale}: missing translations`);
  }
});
