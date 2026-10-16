import assert from "node:assert/strict";
import { EventEmitter, getEventListeners } from "node:events";
import { existsSync, rmSync } from "node:fs";
import test from "node:test";
import { lighthouseOptions, runLighthouse, waitForDebugger } from "./run-lighthouse.mjs";

class FakeChild extends EventEmitter {
  exitCode = null;
  signalCode = null;
  signals = [];
  unreferenced = false;
  constructor(pid, stubborn = false) {
    super();
    this.pid = pid;
    this.stubborn = stubborn;
  }
  exit(code, signal = null) {
    this.exitCode = code;
    this.signalCode = signal;
    this.emit("exit", code, signal);
  }
  kill(signal) {
    this.signals.push(signal);
    if (!this.stubborn || signal === "SIGKILL") queueMicrotask(() => this.exit(null, signal));
    return true;
  }
  unref() { this.unreferenced = true; }
}

function runner(overrides = {}) {
  const signals = new EventEmitter();
  const children = [];
  const profiles = [];
  const calls = [];
  const checks = [];
  const settings = {
    lighthouseBin: process.execPath,
    env: { CHROME_PATH: process.execPath },
    signalSource: signals,
    cleanupTimeoutMs: 5,
    async checkPort(port) { checks.push(port); },
    async waitForChrome() {},
    killProcess(pid, signal) {
      const child = children.find((candidate) => candidate.pid === -pid);
      assert.ok(child, "only the test's own process group may be signalled");
      child.kill(signal);
    },
    spawnProcess(command, args, options) {
      const chrome = args.includes("--remote-debugging-address=127.0.0.1");
      const child = new FakeChild(1000 + children.length);
      children.push(child);
      calls.push({ command, args, options, chrome, child });
      if (chrome) {
        const profile = args.find((arg) => arg.startsWith("--user-data-dir=")).split("=")[1];
        assert.ok(existsSync(profile));
        profiles.push(profile);
      } else {
        queueMicrotask(() => child.exit(0));
      }
      return child;
    },
    ...overrides,
  };
  return {
    settings, signals, children, profiles, calls, checks,
    run: (args = []) => runLighthouse(args, settings),
    assertClean() {
      assert.equal(signals.listenerCount("SIGINT"), 0);
      assert.equal(signals.listenerCount("SIGTERM"), 0);
      for (const profile of profiles) assert.equal(existsSync(profile), false);
    },
  };
}

test("Lighthouse keeps positional URLs separate from flag values and preserves user flags", () => {
  const args = ["--extra-headers", "https://example.test", "--quiet", "--chrome-flags", "--headless=new --no-sandbox"];
  const result = lighthouseOptions(args);
  assert.equal(result.args[0], "http://localhost:5173/");
  assert.deepEqual(result.args.slice(1, 1 + args.length), args);
  assert.equal(result.args.filter((arg) => arg.startsWith("--chrome-flags")).length, 1);
  const explicit = lighthouseOptions(["--quiet", "https://example.test/", "--port", "9333"]);
  assert.equal(explicit.hasPort, true);
  assert.equal(explicit.args.includes("http://localhost:5173/"), false);
  assert.equal(explicit.args.at(-2), "--hostname=127.0.0.1");
});

test("Lighthouse rejects malformed URLs, missing flag values and non-loopback debuggers", () => {
  for (const args of [
    ["ftp://example.test"], ["http://"], ["https://example.test", "https://other.test"],
    ["--port"], ["--port=0"], ["--port=1.5"], ["--port=65536"], ["--port=1e3"],
    ["--chrome-flags"], ["--hostname"], ["--hostname=0.0.0.0"], ["--hostname", "example.test"],
  ]) assert.throws(() => lighthouseOptions(args), Error, args.join(" "));
  const local = lighthouseOptions(["--hostname", "localhost"]);
  assert.ok(local.args.includes("--hostname=127.0.0.1"));
  assert.equal(local.args.includes("localhost"), false);
});

for (const flag of ["--help", "--version", "-h", "-V"]) {
  test(`${flag} launches Lighthouse without probing a port or launching Chrome`, async () => {
    const harness = runner({ env: { CHROME_PATH: "/nonexistent-browser" } });
    assert.equal(await harness.run([flag]), 0);
    assert.equal(harness.calls.length, 1);
    assert.deepEqual(harness.calls[0].args, [flag]);
    assert.deepEqual(harness.checks, []);
    harness.assertClean();
  });
}

test("explicit debugging ports do not launch or require a local Chrome executable", async () => {
  const harness = runner({ env: { CHROME_PATH: "/nonexistent-browser" } });
  assert.equal(await harness.run(["--port=9333"]), 0);
  assert.equal(harness.calls.length, 1);
  assert.deepEqual(harness.checks, []);
  harness.assertClean();
});

test("Chrome uses an isolated profile and a checked loopback port, then is cleaned up", async () => {
  const harness = runner({ env: { CHROME_PATH: process.execPath, LIGHTHOUSE_DEBUG_PORT: "9333" } });
  assert.equal(await harness.run(["https://example.test/"]), 0);
  assert.deepEqual(harness.checks, [9333]);
  assert.equal(harness.calls.length, 2);
  const [chrome, lighthouse] = harness.calls;
  assert.ok(chrome.args.includes("--remote-debugging-port=9333"));
  assert.equal(chrome.options.detached, process.platform !== "win32");
  assert.ok(lighthouse.args.includes("--port=9333"));
  assert.ok(lighthouse.args.includes("--hostname=127.0.0.1"));
  assert.deepEqual(chrome.child.signals, ["SIGTERM"]);
  assert.deepEqual(lighthouse.child.signals, [], "an exited child must not be signalled again");
  harness.assertClean();
});

test("a busy debugging port fails before a browser or temporary profile is created", async () => {
  const harness = runner({ checkPort: async () => { throw new Error("port occupied"); } });
  await assert.rejects(harness.run(), /port occupied/);
  assert.equal(harness.calls.length, 0);
  harness.assertClean();
});

test("invalid environment ports cannot silently become a different debugging port", async () => {
  for (const port of ["0", "-1", "1.5", "1e3", "65536", " 9222 "]) {
    const harness = runner({ env: { CHROME_PATH: process.execPath, LIGHTHOUSE_DEBUG_PORT: port } });
    await assert.rejects(harness.run(), /LIGHTHOUSE_DEBUG_PORT must be an integer/);
    assert.equal(harness.calls.length, 0);
    harness.assertClean();
  }
});

test("a thrown Chrome spawn error still removes its temporary profile and signal handlers", async () => {
  let profile;
  const harness = runner({ spawnProcess(command, args) {
    profile = args.find((arg) => arg.startsWith("--user-data-dir=")).split("=")[1];
    throw new Error("spawn blocked");
  } });
  await assert.rejects(harness.run(), /spawn blocked/);
  assert.equal(existsSync(profile), false);
  harness.assertClean();
});

for (const event of ["error", "exit"]) {
  test(`Chrome ${event} before startup aborts readiness and removes its profile`, async () => {
    let startupSignal;
    const harness = runner({
      waitForChrome(port, { signal }) {
        startupSignal = signal;
        queueMicrotask(() => event === "error"
          ? harness.children[0].emit("error", new Error("executable unavailable"))
          : harness.children[0].exit(2));
        return new Promise((resolve, reject) => signal.addEventListener("abort", () => reject(signal.reason), { once: true }));
      },
    });
    await assert.rejects(harness.run(), event === "error" ? /Chrome could not start/ : /Chrome exited before/);
    assert.equal(startupSignal.aborted, true);
    assert.equal(harness.calls.length, 1);
    harness.assertClean();
  });
}

test("a Lighthouse spawn error also terminates the already-running Chrome", async () => {
  const harness = runner();
  const spawn = harness.settings.spawnProcess;
  harness.settings.spawnProcess = (command, args, options) => {
    if (harness.calls.length === 0) return spawn(command, args, options);
    const child = new FakeChild(2000);
    harness.children.push(child);
    queueMicrotask(() => child.emit("error", new Error("LH unavailable")));
    return child;
  };
  await assert.rejects(harness.run(), /Lighthouse could not start: LH unavailable/);
  assert.deepEqual(harness.children[0].signals, ["SIGTERM"]);
  harness.assertClean();
});

for (const [signal, code] of [["SIGINT", 130], ["SIGTERM", 143]]) {
  test(`${signal} during Chrome startup returns ${code} and escalates stubborn cleanup`, async () => {
    const harness = runner({ waitForChrome() {
      harness.children[0].stubborn = true;
      queueMicrotask(() => harness.signals.emit(signal));
      return new Promise(() => {});
    } });
    assert.equal(await harness.run(), code);
    assert.deepEqual(harness.children[0].signals, ["SIGTERM", "SIGKILL"]);
    harness.assertClean();
  });
}

test("signals during Lighthouse execution terminate both child processes", async () => {
  const harness = runner();
  const spawn = harness.settings.spawnProcess;
  harness.settings.spawnProcess = (command, args, options) => {
    if (harness.calls.length === 0) return spawn(command, args, options);
    const child = new FakeChild(2000);
    harness.children.push(child);
    queueMicrotask(() => harness.signals.emit("SIGTERM"));
    return child;
  };
  assert.equal(await harness.run(), 143);
  assert.deepEqual(harness.children.map((child) => child.signals), [["SIGTERM"], ["SIGTERM"]]);
  harness.assertClean();
});

test("unresponsive children have bounded cleanup and do not prevent profile removal", async () => {
  const harness = runner({ waitForChrome() {
    const child = harness.children[0];
    child.kill = (signal) => { child.signals.push(signal); return false; };
    throw new Error("startup failed");
  } });
  await assert.rejects(harness.run(), (error) => {
    assert.ok(error instanceof AggregateError);
    assert.match(error.message, /startup failed/);
    assert.match(error.message, /did not exit after SIGKILL/);
    return true;
  });
  assert.equal(harness.children[0].unreferenced, true);
  harness.assertClean();
});

test("profile cleanup failures preserve the original error and remove signal listeners", async () => {
  const harness = runner({
    waitForChrome: async () => { throw new Error("startup failed"); },
    removeProfile(profile, options) { rmSync(profile, options); throw new Error("cleanup failed"); },
  });
  await assert.rejects(harness.run(), (error) => {
    assert.deepEqual(error.errors.map((item) => item.message), ["startup failed", "cleanup failed"]);
    return true;
  });
  harness.assertClean();
});

function requests(attempt) {
  const history = [];
  const request = (url, respond) => {
    const pending = new EventEmitter();
    pending.destroyed = false;
    pending.destroy = () => { pending.destroyed = true; };
    pending.setTimeout = (timeout, callback) => { pending.onTimeout = callback; };
    const response = new EventEmitter();
    response.statusCode = 200;
    response.destroyed = false;
    response.destroy = () => { response.destroyed = true; };
    response.resume = () => {};
    history.push({ url, pending, response });
    queueMicrotask(() => attempt(history.length, { pending, response, respond }));
    return pending;
  };
  return { request, history };
}

test("debugger readiness retries failed requests and drains successful responses", async () => {
  const controller = new AbortController();
  const fake = requests((attempt, { pending, response, respond }) => {
    if (attempt === 1) pending.emit("error", new Error("not ready"));
    else { respond(response); response.emit("end"); }
  });
  await waitForDebugger(9333, { signal: controller.signal, ...fake, pollIntervalMs: 1, timeoutMs: 100 });
  assert.equal(fake.history.length, 2);
  for (const { url, pending } of fake.history) {
    assert.equal(url, "http://127.0.0.1:9333/json/version");
    assert.equal(pending.destroyed, true);
  }
  assert.equal(fake.history[1].response.destroyed, true);
  assert.equal(getEventListeners(controller.signal, "abort").length, 0);
});

test("debugger readiness times out even when the request or response never completes", async () => {
  for (const headers of [false, true]) {
    const controller = new AbortController();
    const fake = requests((attempt, { response, respond }) => { if (headers) respond(response); });
    await assert.rejects(waitForDebugger(9333, {
      signal: controller.signal, ...fake, timeoutMs: 10, requestTimeoutMs: 5,
    }), /within 10ms/);
    assert.equal(fake.history[0].pending.destroyed, true);
    if (headers) assert.equal(fake.history[0].response.destroyed, true);
    assert.equal(getEventListeners(controller.signal, "abort").length, 0);
  }
});

test("aborting debugger startup destroys active streams and does not poll again", async () => {
  const controller = new AbortController();
  const fake = requests((attempt, { response, respond }) => {
    respond(response);
    controller.abort(new Error("cancelled startup"));
  });
  await assert.rejects(waitForDebugger(9333, { signal: controller.signal, ...fake }), /cancelled startup/);
  assert.equal(fake.history.length, 1);
  assert.equal(fake.history[0].pending.destroyed, true);
  assert.equal(fake.history[0].response.destroyed, true);
  assert.equal(getEventListeners(controller.signal, "abort").length, 0);
});

test("an already-aborted startup creates no HTTP request", async () => {
  const controller = new AbortController();
  controller.abort(new Error("already cancelled"));
  await assert.rejects(waitForDebugger(9333, {
    signal: controller.signal, request: () => { assert.fail("must not request"); },
  }), /already cancelled/);
});

test("injected debugger options stay before the positional delimiter", async () => {
  const harness = runner();
  assert.equal(await harness.run(["--", "https://example.test/"]), 0);
  const args = harness.calls[1].args;
  assert.deepEqual(args.slice(args.indexOf("--")), ["--", "https://example.test/"]);
  assert.ok(args.indexOf("--port=9222") < args.indexOf("--"));
  harness.assertClean();
});

test("disabled help flags still run a measurement", () => {
  for (const args of [["--help=false"], ["--help", "false"]]) {
    const options = lighthouseOptions(args);
    assert.equal(options.passthroughOnly, false);
    assert.equal(options.args[0], "http://localhost:5173/");
  }
});

test("failed debugger responses and request timeouts retry without duplicate polling", async () => {
  const fake = requests((attempt, { pending, response, respond }) => {
    if (attempt === 1) {
      pending.onTimeout();
      pending.emit("error", new Error("request closed"));
    } else {
      response.statusCode = attempt === 2 ? 503 : 200;
      respond(response);
      response.emit("end");
    }
  });
  await waitForDebugger(9333, { ...fake, pollIntervalMs: 1, timeoutMs: 100 });
  assert.equal(fake.history.length, 3);
  for (const { pending } of fake.history) assert.equal(pending.destroyed, true);
});

test("a response arriving after cancellation is consumed safely", async () => {
  const controller = new AbortController();
  let respondLate;
  const fake = requests((attempt, { respond, response }) => {
    respondLate = () => { respond(response); response.emit("error", new Error("late close")); };
    controller.abort(new Error("cancelled"));
  });
  await assert.rejects(waitForDebugger(9333, { signal: controller.signal, ...fake }), /cancelled/);
  assert.doesNotThrow(respondLate);
  assert.equal(fake.history[0].response.destroyed, true);
});

test("a missing optional Lighthouse installation fails before adding any signal handlers", async () => {
  const harness = runner({ lighthouseBin: "/nonexistent-lighthouse" });
  await assert.rejects(harness.run(["--help"]), /npm --prefix tools\/performance ci/);
  assert.equal(harness.calls.length, 0);
  harness.assertClean();
});

test("an aborted debugger response cannot become ready through a late end event", async () => {
  const fake = requests((attempt, { response, respond }) => {
    respond(response);
    if (attempt === 1) response.emit("aborted");
    response.emit("end");
  });
  await waitForDebugger(9333, { ...fake, pollIntervalMs: 1, timeoutMs: 100 });
  assert.equal(fake.history.length, 2);
});
