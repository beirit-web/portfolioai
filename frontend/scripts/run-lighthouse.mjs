import { accessSync, constants, mkdtempSync, rmSync } from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";
import { tmpdir } from "node:os";
import { get } from "node:http";
import { createServer } from "node:net";

const frontendRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const defaultLighthouseBin = resolve(frontendRoot, "../tools/performance/node_modules/.bin/lighthouse");
const defaultChromePaths = [
  "/usr/bin/google-chrome-stable", "/usr/bin/google-chrome", "/usr/bin/chromium",
  "/usr/bin/chromium-browser", "/usr/bin/brave-browser-stable", "/usr/bin/vivaldi-stable",
];
// Other options consume their next non-option token; equals syntax is passed through unchanged.
const booleanFlags = new Set([
  "--help", "-h", "--version", "-V", "--verbose", "--quiet", "--view", "--save-assets",
  "--list-all-audits", "--list-trace-categories", "--disable-storage-reset", "--clear-storage",
  "--enable-error-reporting", "--enable-experimental-insights", "--disable-full-page-screenshot",
  "--disable-device-emulation", "--disable-cpu-throttling", "--disable-network-throttling",
]);

function isExecutable(path) {
  try {
    accessSync(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function debuggingPort(value, name) {
  if (!/^\d+$/.test(String(value)) || Number(value) < 1 || Number(value) > 65535) {
    throw new Error(`${name} must be an integer between 1 and 65535.`);
  }
  return Number(value);
}

function appendOptions(args, additions) {
  const separator = args.indexOf("--");
  args.splice(separator === -1 ? args.length : separator, 0, ...additions);
  return args;
}

export function lighthouseOptions(args) {
  let passthroughOnly = false;
  let hasChromeFlags = false;
  let hasPort = false;
  let positionalOnly = false;
  const positionals = [];
  const forwarded = [];
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === "--") {
      positionalOnly = true;
      forwarded.push(arg);
      continue;
    }
    if (positionalOnly || !arg.startsWith("-")) {
      positionals.push(arg);
      forwarded.push(arg);
      continue;
    }
    const separator = arg.indexOf("=");
    const name = separator === -1 ? arg : arg.slice(0, separator);
    let value = separator === -1 ? undefined : arg.slice(separator + 1);
    if (booleanFlags.has(name) || name.startsWith("--no-")) {
      if (value === undefined && ["true", "false"].includes(args[index + 1])) value = args[index + 1];
      if (["--help", "-h", "--version", "-V", "--list-all-audits", "--list-trace-categories"].includes(name)) {
        passthroughOnly ||= value !== "false";
      }
      forwarded.push(arg);
      if (separator === -1 && ["true", "false"].includes(args[index + 1])) forwarded.push(args[++index]);
      continue;
    }
    if (value === undefined && args[index + 1] && (name === "--chrome-flags" || !args[index + 1].startsWith("-"))) value = args[++index];
    if (["--port", "--hostname", "--chrome-flags"].includes(name) && value === undefined) {
      throw new Error(`${name} requires a value (use ${name}=VALUE for values beginning with a dash).`);
    }
    if (name === "--port") {
      debuggingPort(value, "--port");
      hasPort = true;
    }
    if (name === "--hostname") {
      if (!["127.0.0.1", "localhost"].includes(value)) throw new Error("--hostname must use the local debugger (127.0.0.1 or localhost).");
      // Use the same address for probing Chrome and for Lighthouse's connection.
      continue;
    }
    if (name === "--chrome-flags") hasChromeFlags = true;
    forwarded.push(arg);
    if (separator === -1 && value !== undefined) forwarded.push(value);
  }
  if (!passthroughOnly) {
    for (const value of positionals) {
      let url;
      try { url = new URL(value); } catch { /* Report the same useful error for malformed targets. */ }
      if (!url || !["http:", "https:"].includes(url.protocol)) throw new Error("The Lighthouse target must be an HTTP(S) URL.");
    }
  }
  if (positionals.length > 1) throw new Error("Provide only one Lighthouse target URL.");
  return {
    passthroughOnly,
    hasPort,
    args: appendOptions([
      ...(passthroughOnly || positionals.length ? [] : ["http://localhost:5173/"]),
      ...forwarded,
    ], [
      ...(passthroughOnly ? [] : ["--hostname=127.0.0.1"]),
      ...(passthroughOnly || hasChromeFlags ? [] : ["--chrome-flags=--headless=new --no-sandbox --disable-dev-shm-usage"]),
    ]),
  };
}

export function assertPortAvailable(port) {
  return new Promise((resolveFree, reject) => {
    const server = createServer();
    server.once("error", (error) => {
      reject(new Error(
        error.code === "EADDRINUSE"
          ? `Local debugging port ${port} is occupied. Choose another LIGHTHOUSE_DEBUG_PORT or explicitly pass --port to use an existing browser.`
          : `Cannot open local debugging port ${port}: ${error.message}`,
        { cause: error }
      ));
    });
    server.listen({ host: "127.0.0.1", port, exclusive: true }, () => server.close(resolveFree));
  });
}

export function waitForDebugger(port, {
  signal,
  timeoutMs = 10_000,
  pollIntervalMs = 100,
  requestTimeoutMs = 500,
  request = get,
} = {}) {
  return new Promise((resolveReady, reject) => {
    let pollTimer;
    let activeRequest;
    let activeResponse;
    let settled = false;
    const destroyActive = () => {
      activeResponse?.destroy();
      activeRequest?.destroy();
      activeResponse = undefined;
      activeRequest = undefined;
    };
    const finish = (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(deadlineTimer);
      clearTimeout(pollTimer);
      signal?.removeEventListener("abort", abort);
      destroyActive();
      if (error) reject(error);
      else resolveReady();
    };
    const abort = () => finish(signal.reason ?? new Error("Chrome startup cancelled."));
    const deadlineTimer = setTimeout(() => finish(new Error(
      `Chrome did not open remote debugging port ${port} within ${timeoutMs}ms.`
    )), timeoutMs);
    const poll = () => {
      if (settled) return;
      let retried = false;
      const retry = () => {
        if (settled || retried) return;
        retried = true;
        destroyActive();
        pollTimer = setTimeout(poll, pollIntervalMs);
      };
      try {
        const pending = request(`http://127.0.0.1:${port}/json/version`, (response) => {
          if (settled || retried) {
            response.on("error", () => {});
            response.destroy();
            return;
          }
          activeResponse = response;
          response.on("error", retry);
          response.on("aborted", retry);
          response.on("end", () => {
            if (settled || retried) return;
            if (response.statusCode >= 200 && response.statusCode < 300) finish();
            else retry();
          });
          response.resume();
        });
        pending.on("error", retry);
        activeRequest = pending;
        if (settled || retried) pending.destroy();
        else pending.setTimeout(requestTimeoutMs, retry);
      } catch {
        retry();
      }
    };
    if (signal?.aborted) abort();
    else {
      signal?.addEventListener("abort", abort, { once: true });
      poll();
    }
  });
}

function watchChild(child, name) {
  let resolveStopped;
  const stopped = new Promise((resolveExit) => { resolveStopped = resolveExit; });
  const completion = new Promise((resolveExit, reject) => {
    // Keep consuming errors during cleanup too, including a failed kill after a spawn error.
    child.on("error", (error) => {
      reject(new Error(`${name} could not start: ${error.message}`, { cause: error }));
      if (!child.pid) resolveStopped();
    });
    child.once("exit", (code, signal) => {
      resolveStopped();
      resolveExit({ code, signal });
    });
  });
  completion.catch(() => {});
  return { completion, stopped };
}

async function withAbort(promise, signal) {
  // Observe rejections even when a signal arrived before the operation could be awaited.
  promise = Promise.resolve(promise);
  promise.catch(() => {});
  if (signal.aborted) throw signal.reason;
  let abort;
  const cancelled = new Promise((_, reject) => {
    abort = () => reject(signal.reason);
    signal.addEventListener("abort", abort, { once: true });
  });
  try {
    return await Promise.race([promise, cancelled]);
  } finally {
    signal.removeEventListener("abort", abort);
  }
}

async function waitForExit(completion, timeoutMs) {
  let timer;
  try {
    return await Promise.race([
      completion.then(() => true, () => true),
      new Promise((resolveTimeout) => { timer = setTimeout(() => resolveTimeout(false), timeoutMs); }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

async function stopChild(child, watcher, { group = false, timeoutMs, killProcess }) {
  if (!child || (!group && (child.exitCode != null || child.signalCode != null))) return;
  const kill = (signal) => {
    try {
      if (group && child.pid && process.platform !== "win32") killProcess(-child.pid, signal);
      else child.kill(signal);
    } catch {
      // The child or its process group may already have exited.
    }
  };
  kill("SIGTERM");
  if (!await waitForExit(watcher.stopped, timeoutMs)) {
    kill("SIGKILL");
    if (!await waitForExit(watcher.stopped, timeoutMs)) {
      child.unref();
      throw new Error("A Lighthouse test process did not exit after SIGKILL.");
    }
  }
}

export async function runLighthouse(args, {
  env = process.env,
  lighthouseBin = defaultLighthouseBin,
  spawnProcess = spawn,
  checkPort = assertPortAvailable,
  waitForChrome = waitForDebugger,
  signalSource = process,
  killProcess = process.kill,
  removeProfile = rmSync,
  cleanupTimeoutMs = 1000,
} = {}) {
  if (!isExecutable(lighthouseBin)) {
    throw new Error("Lighthouse is optional. Install it from the repository root: npm --prefix tools/performance ci");
  }
  const options = lighthouseOptions(args);
  const chromePath = options.passthroughOnly || options.hasPort ? undefined : [env.CHROME_PATH, ...defaultChromePaths].filter(Boolean).find(isExecutable);
  if (!options.passthroughOnly && !options.hasPort && !chromePath) {
    throw new Error("No executable Chrome-compatible browser found. Set CHROME_PATH to Chrome, Chromium, Brave, or Vivaldi.");
  }

  const controller = new AbortController();
  let interrupted;
  let chrome;
  let chromeExit;
  let lighthouse;
  let lighthouseExit;
  let profile;
  let result;
  let failure;
  const interrupt = (code) => {
    interrupted = code;
    controller.abort(new Error("Lighthouse interrupted."));
  };
  const onInterrupt = () => interrupt(130);
  const onTerminate = () => interrupt(143);
  signalSource.on("SIGINT", onInterrupt);
  signalSource.on("SIGTERM", onTerminate);
  try {
    if (!options.passthroughOnly && !options.hasPort) {
      const port = debuggingPort(env.LIGHTHOUSE_DEBUG_PORT || 9222, "LIGHTHOUSE_DEBUG_PORT");
      await withAbort(checkPort(port), controller.signal);
      controller.signal.throwIfAborted();
      profile = mkdtempSync(resolve(tmpdir(), "beirit-lighthouse-"));
      chrome = spawnProcess(chromePath, [
        "--headless=new", "--no-sandbox", "--disable-dev-shm-usage",
        "--remote-debugging-address=127.0.0.1",
        `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "about:blank",
      ], { detached: process.platform !== "win32", stdio: "ignore" });
      chromeExit = watchChild(chrome, "Chrome");
      await withAbort(Promise.race([
        waitForChrome(port, { signal: controller.signal }),
        chromeExit.completion.then(({ code, signal }) => { throw new Error(`Chrome exited before its debugger was ready (${signal ?? code}).`); }),
      ]), controller.signal);
      appendOptions(options.args, [`--port=${port}`]);
    }
    controller.signal.throwIfAborted();
    lighthouse = spawnProcess(lighthouseBin, options.args, {
      cwd: frontendRoot,
      env: chromePath ? { ...env, CHROME_PATH: chromePath } : env,
      stdio: "inherit",
    });
    lighthouseExit = watchChild(lighthouse, "Lighthouse");
    const { code, signal } = await withAbort(lighthouseExit.completion, controller.signal);
    if (signal) throw new Error(`Lighthouse terminated by signal ${signal}`);
    result = code ?? 1;
  } catch (error) {
    failure = error;
  }
  controller.abort(new Error("Lighthouse finished."));
  const cleanup = await Promise.allSettled([
    stopChild(lighthouse, lighthouseExit, { timeoutMs: cleanupTimeoutMs, killProcess }),
    stopChild(chrome, chromeExit, { group: true, timeoutMs: cleanupTimeoutMs, killProcess }),
  ]);
  try {
    // Chrome helpers can finish writing after the main browser has exited.
    if (profile) removeProfile(profile, { force: true, recursive: true, maxRetries: 5, retryDelay: 200 });
  } catch (error) {
    cleanup.push({ status: "rejected", reason: error });
  } finally {
    signalSource.off("SIGINT", onInterrupt);
    signalSource.off("SIGTERM", onTerminate);
  }
  const errors = cleanup.filter((item) => item.status === "rejected").map((item) => item.reason);
  if (interrupted) return interrupted;
  if (failure && errors.length === 0) throw failure;
  if (failure) errors.unshift(failure);
  if (errors.length) throw new AggregateError(errors, errors.map((error) => error.message).join("; "));
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    process.exitCode = await runLighthouse(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
