import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";
import { normalizeTechnologyLabel, sortTechnologyLabels, technologyLogos, technologyLogoSrc } from "./technologyLogos.mjs";

test("technology aliases resolve to the same name and logo", () => {
  for (const [alias, canonical] of [["HTML5", "HTML"], ["CSS3", "CSS"], ["JS", "JavaScript"], ["Node", "Node.js"], ["nodeJS", "Node.js"], ["SCSS", "Sass"], ["TailwindCSS", "Tailwind CSS"], ["iNaturalist", "iNaturalist API"]]) {
    assert.equal(normalizeTechnologyLabel(alias), canonical);
    assert.equal(technologyLogoSrc(alias), technologyLogoSrc(canonical));
  }
});

test("technology order is consistent and removes duplicate aliases", () => {
  assert.deepEqual(sortTechnologyLabels(["Vite", "JS", "React", "HTML5", "JavaScript", "Custom API", ""]), ["JavaScript", "React", "HTML", "Vite", "Custom API"]);
  assert.equal(normalizeTechnologyLabel(" Custom API "), "Custom API");
  assert.equal(technologyLogoSrc("Custom API"), null);
});

test("every configured technology logo exists in the server assets", () => {
  for (const filename of Object.values(technologyLogos)) {
    assert.ok(existsSync(new URL(`../../../../server/assets/images/${filename}`, import.meta.url)), filename);
  }
});
