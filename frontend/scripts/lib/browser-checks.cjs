const { execFileSync } = require("node:child_process");
const { randomUUID, randomBytes } = require("node:crypto");
const path = require("node:path");

const workspace = path.resolve(__dirname, "../../..");
const server = path.join(workspace, "server");

function localBaseUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Browser checks require a local HTTP(S) origin.");
  }
  if (!["http:", "https:"].includes(url.protocol)
      || !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
      || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("Browser checks require a local HTTP(S) origin without credentials, path, query or fragment.");
  }
  return url.origin;
}

function screenshotDirectory(app, override) {
  return path.resolve(workspace, override || `runtime/${app}-checks/screenshots`);
}

function createTestAccount(app, environment = process.env) {
  const email = `${app}-check-${randomUUID()}@example.test`;
  const password = randomBytes(24).toString("base64url");
  const prefix = app.toUpperCase();
  return {
    email,
    password,
    env: { ...environment, [`${prefix}_TEST_EMAIL`]: email, [`${prefix}_TEST_PASSWORD`]: password },
  };
}

function createDjangoShell(env, execute = execFileSync) {
  return code => execute(path.join(server, ".venv/bin/python"), ["manage.py", "shell", "--no-imports", "-c", code], {
    cwd: server, env, encoding: "utf8", timeout: 60000,
  }).trim();
}

async function closeBrowserAndCleanup(browser, cleanup) {
  try {
    if (browser) await browser.close();
  } finally {
    if (cleanup) await cleanup();
  }
}

module.exports = { localBaseUrl, screenshotDirectory, createTestAccount, createDjangoShell, closeBrowserAndCleanup };
