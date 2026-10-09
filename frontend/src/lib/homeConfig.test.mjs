import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";

const source = readFileSync(new URL("./homeConfig.js", import.meta.url), "utf8");

function loadHomeConfig(globals = {}) {
  // These browser modules only use named exports; a fresh context isolates each page configuration.
  return runInNewContext(`${source.replace(/^export /gm, "")}\n({ homeConfig, getDjangoOrigin, publicPageBaseUrl, publicPageUrl })`, globals);
}

test("missing page configuration and location keep public links relative", () => {
  const config = loadHomeConfig();
  assert.deepEqual(Object.keys(config.homeConfig), []);
  assert.equal(config.getDjangoOrigin(), "");
  assert.equal(config.publicPageBaseUrl, "");
  assert.equal(config.publicPageUrl("/datenschutz/"), "/datenschutz/");
});

test("Django page configuration is preserved, including contact and payment URLs", () => {
  const pageConfig = {
    contactApiUrl: "/custom/contact/",
    publicPageBaseUrl: "https://beirit.example",
    paypalDonateUrl: "https://payments.example/donate",
  };
  const config = loadHomeConfig({ BEIRIT_HOME_CONFIG: pageConfig });
  assert.equal(config.homeConfig, pageConfig);
  assert.equal(config.homeConfig.contactApiUrl, "/custom/contact/");
  assert.equal(config.homeConfig.paypalDonateUrl, "https://payments.example/donate");
  assert.equal(config.publicPageUrl("/spenden/"), "https://beirit.example/spenden/");
});

test("an explicit public base URL takes precedence over the Vite development origin", () => {
  const config = loadHomeConfig({
    BEIRIT_HOME_CONFIG: { publicPageBaseUrl: "https://public.example" },
    location: { protocol: "http:", hostname: "localhost", port: "5173" },
  });
  assert.equal(config.getDjangoOrigin(), "http://localhost:8000");
  assert.equal(config.publicPageBaseUrl, "https://public.example");
  assert.equal(config.publicPageUrl("/impressum?lang=de#kontakt"), "https://public.example/impressum?lang=de#kontakt");
});

test("Vite ports resolve Django on the same host and protocol", () => {
  for (const [protocol, hostname, port, expected] of [
    ["http:", "localhost", "5170", "http://localhost:8000"],
    ["http:", "127.0.0.1", "5173", "http://127.0.0.1:8000"],
    ["https:", "dev.beirit.example", "5179", "https://dev.beirit.example:8000"],
  ]) {
    const config = loadHomeConfig({ location: { protocol, hostname, port } });
    assert.equal(config.getDjangoOrigin(), expected);
    assert.equal(config.publicPageUrl("/spenden/"), `${expected}/spenden/`);
  }
});

test("an empty public base URL falls back to Django during development", () => {
  const config = loadHomeConfig({
    BEIRIT_HOME_CONFIG: { publicPageBaseUrl: "" },
    location: { protocol: "http:", hostname: "localhost", port: "5173" },
  });
  assert.equal(config.publicPageBaseUrl, "http://localhost:8000");
});

test("production and unrelated development ports keep public URLs relative", () => {
  for (const port of [undefined, "", "80", "443", "3000", "8000", "517", "5180", "51730"]) {
    const config = loadHomeConfig({ location: { protocol: "https:", hostname: "beirit.example", port } });
    assert.equal(config.getDjangoOrigin(), "", `port ${port}`);
    assert.equal(config.publicPageUrl("/datenschutz/"), "/datenschutz/", `port ${port}`);
  }
});
