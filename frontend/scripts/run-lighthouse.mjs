import { accessSync, constants, mkdtempSync, rmSync } from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { tmpdir } from "node:os";
import { get } from "node:http";

const __dirname = dirname(fileURLToPath(import.meta.url));
const frontendRoot = resolve(__dirname, "..");

const chromeCandidates = [
  process.env.CHROME_PATH,
  "/usr/bin/google-chrome-stable",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/usr/bin/brave-browser-stable",
  "/usr/bin/vivaldi-stable",
].filter(Boolean);

function isExecutable(path) {
  try {
    accessSync(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

const chromePath = chromeCandidates.find(isExecutable);

if (!chromePath) {
  console.error(
    "No executable Chrome-compatible browser found. Set CHROME_PATH to Chrome, Chromium, Brave, or Vivaldi."
  );
  process.exit(1);
}

const args = process.argv.slice(2);
const passthroughOnly = args.some((arg) => arg === "--version" || arg === "-V" || arg === "--help" || arg === "-h");
const hasUrl = args.some((arg) => !arg.startsWith("-"));
const hasChromeFlags = args.some((arg) => arg === "--chrome-flags" || arg.startsWith("--chrome-flags="));
const hasPort = args.some((arg) => arg === "--port" || arg.startsWith("--port="));
const lighthouseArgs = [
  ...(hasUrl ? [] : ["http://localhost:5173/"]),
  ...args,
  ...(passthroughOnly || hasChromeFlags
    ? []
    : ["--chrome-flags=--headless=new --no-sandbox --disable-dev-shm-usage"]),
];

const lighthouseBin = resolve(frontendRoot, "node_modules", ".bin", "lighthouse");

let chromeProcess;
let chromeProfileDir;

function waitForDebugger(port, timeoutMs = 10_000) {
  const deadline = Date.now() + timeoutMs;

  return new Promise((resolveReady, reject) => {
    const poll = () => {
      const request = get(`http://127.0.0.1:${port}/json/version`, (response) => {
        response.resume();
        if (response.statusCode && response.statusCode >= 200 && response.statusCode < 300) {
          resolveReady();
          return;
        }

        retry();
      });

      request.on("error", retry);
      request.setTimeout(500, () => {
        request.destroy();
        retry();
      });
    };

    const retry = () => {
      if (Date.now() > deadline) {
        reject(new Error(`Chrome did not open remote debugging port ${port} within ${timeoutMs}ms.`));
        return;
      }

      setTimeout(poll, 100);
    };

    poll();
  });
}

if (!passthroughOnly && !hasPort) {
  const port = Number(process.env.LIGHTHOUSE_DEBUG_PORT || 9222);
  chromeProfileDir = mkdtempSync(resolve(tmpdir(), "beirit-lighthouse-"));
  chromeProcess = spawn(
    chromePath,
    [
      "--headless=new",
      "--no-sandbox",
      "--disable-dev-shm-usage",
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${chromeProfileDir}`,
      "about:blank",
    ],
    {
      detached: process.platform !== "win32",
      stdio: "ignore",
    }
  );
  chromeProcess.unref();
  await waitForDebugger(port);
  lighthouseArgs.push(`--port=${port}`);
}

const child = spawn(lighthouseBin, lighthouseArgs, {
  cwd: frontendRoot,
  env: {
    ...process.env,
    CHROME_PATH: chromePath,
  },
  stdio: "inherit",
});

const stopChrome = () => {
  if (chromeProcess?.pid) {
    try {
      if (process.platform === "win32") {
        chromeProcess.kill("SIGKILL");
      } else {
        process.kill(-chromeProcess.pid, "SIGKILL");
      }
    } catch {
      // Chrome may already have exited.
    }

    chromeProcess = undefined;
  }

  if (chromeProfileDir) {
    rmSync(chromeProfileDir, { force: true, recursive: true });
    chromeProfileDir = undefined;
  }
};

process.on("SIGINT", () => {
  stopChrome();
  process.exit(130);
});

process.on("SIGTERM", () => {
  stopChrome();
  process.exit(143);
});

child.on("exit", (code, signal) => {
  stopChrome();

  if (signal) {
    console.error(`Lighthouse terminated by signal ${signal}`);
    process.exit(1);
  }

  process.exit(code ?? 1);
});
