import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import test from "node:test";
import helpers from "./lib/browser-checks.cjs";

const { localBaseUrl, screenshotDirectory, createTestAccount, createDjangoShell, closeBrowserAndCleanup } = helpers;
const scripts = fileURLToPath(new URL(".", import.meta.url));
const workspace = path.resolve(scripts, "../..");

test("browser targets accept loopback HTTP(S) origins and normalize a trailing slash", () => {
  for (const origin of ["http://127.0.0.1:8000", "http://localhost:8765", "https://[::1]:8443"]) {
    assert.equal(localBaseUrl(`${origin}/`), origin);
  }
});

test("browser targets reject external hosts and non-origin URL settings", () => {
  for (const value of [
    "https://example.test", "http://localhost.example.test:8000", "http://0.0.0.0:8000",
    "http://192.168.1.1:8000", "http://127.0.0.1:8000/shop/", "http://user:secret@localhost:8000",
    "http://localhost:8000?mode=example", "http://localhost:8000#example", "ftp://localhost", "invalid",
  ]) {
    assert.throws(() => localBaseUrl(value), /local HTTP\(S\) origin/);
  }
});

test("screenshot defaults and relative overrides stay rooted in the workspace", () => {
  const previous = process.cwd();
  try {
    process.chdir(os.tmpdir());
    assert.equal(screenshotDirectory("shop"), path.join(workspace, "runtime/shop-checks/screenshots"));
    assert.equal(screenshotDirectory("botanic", "runtime/example"), path.join(workspace, "runtime/example"));
    const absolute = path.join(os.tmpdir(), "example-screenshots");
    assert.equal(screenshotDirectory("contracts", absolute), absolute);
  } finally {
    process.chdir(previous);
  }
});

test("test accounts are unique fictional accounts without changing the inherited environment", () => {
  const environment = { DB_PATH: "/tmp/example.sqlite3" };
  const first = createTestAccount("shop", environment);
  const second = createTestAccount("shop", environment);
  assert.match(first.email, /^shop-check-[a-f0-9-]+@example\.test$/);
  assert.notEqual(first.email, second.email);
  assert.notEqual(first.password, second.password);
  assert.equal(first.env.SHOP_TEST_EMAIL, first.email);
  assert.equal(first.env.SHOP_TEST_PASSWORD, first.password);
  assert.equal(first.env.DB_PATH, environment.DB_PATH);
  assert.deepEqual(environment, { DB_PATH: "/tmp/example.sqlite3" });
});

test("Django setup and cleanup share the same environment, interpreter and bounded invocation", () => {
  const env = { DB_PATH: "/tmp/example.sqlite3" };
  const calls = [];
  const django = createDjangoShell(env, (...args) => { calls.push(args); return "\n{}\n"; });
  assert.equal(django("print('{}')"), "{}");
  assert.equal(django("cleanup()"), "{}");
  for (const [executable, args, options] of calls) {
    assert.equal(executable, path.join(workspace, "server/.venv/bin/python"));
    assert.deepEqual(args.slice(0, 4), ["manage.py", "shell", "--no-imports", "-c"]);
    assert.equal(options.cwd, path.join(workspace, "server"));
    assert.equal(options.env, env);
    assert.equal(options.timeout, 60000);
  }
});

test("data cleanup still runs when closing the browser fails", async () => {
  const events = [];
  const error = new Error("Browser close failed");
  await assert.rejects(closeBrowserAndCleanup({
    async close() { events.push("close"); throw error; },
  }, async () => { events.push("cleanup"); }), error);
  assert.deepEqual(events, ["close", "cleanup"]);
});

test("data cleanup runs even when browser startup was never reached", async () => {
  let cleaned = false;
  await closeBrowserAndCleanup(undefined, () => { cleaned = true; });
  assert.equal(cleaned, true);
});

for (const app of ["botanic", "shop"]) {
  for (const failure of ["seed-response", "browser-close"]) {
    test(`${app} removes its exact test account after a ${failure} failure`, async () => {
      const calls = [];
      let browserStarted = false;
      const processStub = { env: {}, exitCode: 0 };
      const script = fs.readFileSync(path.join(scripts, `check-${app}.cjs`), "utf8");
      await vm.runInNewContext(script, {
        require(name) {
          if (name === "@playwright/test") return {
            chromium: { async launch() {
              browserStarted = true;
              return {
                async newContext() { throw new Error("Workflow failed"); },
                async close() { throw new Error("Browser close failed"); },
              };
            } },
          };
          if (name === "./lib/browser-checks.cjs") return {
            ...helpers,
            createDjangoShell(env) {
              return code => {
                calls.push({ code, env });
                return failure === "seed-response" ? "invalid JSON after setup" : "{}";
              };
            },
          };
          if (name === "node:fs") return { mkdirSync() {} };
          if (name === "node:path") return path;
          throw new Error(`Unexpected dependency: ${name}`);
        },
        process: processStub,
        console: { error() {}, log() {} },
      });
      assert.equal(processStub.exitCode, 1);
      assert.equal(browserStarted, failure === "browser-close");
      assert.equal(calls.length, 2, "setup and cleanup must both run");
      const [{ env }, cleanup] = calls;
      assert.equal(cleanup.env, env);
      const key = `${app.toUpperCase()}_TEST_EMAIL`;
      assert.match(env[key], new RegExp(`^${app}-check-[a-f0-9-]+@example\\.test$`));
      assert.ok(cleanup.code.includes(`filter(username=os.environ['${key}']).delete()`));
      if (app === "shop") assert.ok(cleanup.code.includes(`filter(customer_email=os.environ['${key}']).delete()`));
    });
  }
}
