import { spawn } from "node:child_process";
import { mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const frontend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const projects = ["vertragsgenerator", "online-shop", "enbt-botanic", "wohnungssuche-bodensee", "notenrechner", "sprachdienstleistungen"];
export const targets = [
  { id: "contract-app", route: "/vertragsgenerator/" },
  { id: "shop-app", route: "/shop/" },
  { id: "botanic-app", route: "/botanic/" },
  { id: "weather-app", route: "/botanic/wetter/" },
  { id: "housing-app", route: "/wohnungssuche/" },
  { id: "grades-app", route: "/static/portfolio/notenrechner/index.html" },
  { id: "language-app", route: "/deutschlive/" },
  { id: "vocabulary-app", route: "/vokabelbox/" },
  ...projects.map(slug => ({ id: `${slug}-report`, route: `/projekte/${slug}` })),
];
const metricNames = ["first-contentful-paint", "largest-contentful-paint", "total-blocking-time", "cumulative-layout-shift"];
const optionNames = new Set(["phase", "profiles", "runs", "resume", "targets", "base-url", "output", "help", "list-targets"]);

export function parseOptions(args, { frontendDir = frontend } = {}) {
  const values = {};
  for (const arg of args) {
    const match = arg.match(/^--([a-z-]+)(?:=(.*))?$/s);
    if (!match) throw new Error(`Use --name=value: ${arg}`);
    const [, name, value] = match;
    if (!optionNames.has(name)) throw new Error(`Unknown option: --${name}`);
    if (Object.hasOwn(values, name)) throw new Error(`Duplicate option: --${name}`);
    if (["help", "list-targets"].includes(name)) {
      if (value !== undefined) throw new Error(`Use --${name} without a value`);
      values[name] = true;
    } else {
      if (value === undefined || value.trim() === "") throw new Error(`Use a non-empty --${name}=value`);
      values[name] = value;
    }
  }
  const phase = values.phase ?? "baseline";
  if (!/^[a-z0-9-]+$/.test(phase)) throw new Error("Invalid phase: use lowercase letters, numbers, and hyphens");
  const selection = (name, defaults, allowed) => {
    const selected = values[name] === undefined ? defaults : values[name].split(",");
    if (selected.some(value => !allowed.includes(value))) throw new Error(`Invalid --${name}: use ${allowed.join(", ")}`);
    if (new Set(selected).size !== selected.length) throw new Error(`Duplicate value in --${name}`);
    return selected;
  };
  const profiles = selection("profiles", ["mobile", "desktop"], ["mobile", "desktop"]);
  const selected = selection("targets", targets.map(target => target.id), targets.map(target => target.id));
  const runs = Number(values.runs ?? 1);
  if (!/^\d+$/.test(values.runs ?? "1") || !Number.isInteger(runs) || runs < 1 || runs > 10) throw new Error("Use --runs=1 through --runs=10");
  if (values.resume !== undefined && !["true", "false"].includes(values.resume)) throw new Error("Use --resume=true or --resume=false");
  let base;
  try {
    const url = new URL(values["base-url"] ?? "http://127.0.0.1:8765");
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.pathname !== "/" || url.search || url.hash) throw new Error();
    base = url.origin;
  } catch {
    throw new Error("Use --base-url with an HTTP(S) origin, for example http://127.0.0.1:8765");
  }
  return {
    phase, profiles, runs, selected, base, resume: values.resume === "true",
    output: path.resolve(frontendDir, values.output ?? "../runtime/lighthouse/projects"),
    help: values.help === true, listTargets: values["list-targets"] === true,
  };
}

async function runChild(args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, options);
    child.once("error", reject);
    child.once("exit", (code, signal) => resolve({ code, signal }));
  });
}

async function readSummary(file, { selected, profiles, resume, base, phase }) {
  let previousResults;
  try {
    previousResults = JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw new Error(`Cannot read summary ${file}: ${error.message}`, { cause: error });
  }
  if (!Array.isArray(previousResults)) throw new Error(`Invalid summary ${file}: expected an array of results`);
  const recorded = new Set();
  for (const item of previousResults) {
    if (!item || typeof item !== "object" || Array.isArray(item) || typeof item.target !== "string" || !item.target ||
        typeof item.profile !== "string" || !item.profile || !Number.isInteger(item.run) || item.run < 1) {
      throw new Error(`Invalid summary ${file}: expected target, profile, and a positive run number`);
    }
    const key = `${item.target}/${item.profile}/${item.run}`;
    if (recorded.has(key)) throw new Error(`Invalid summary ${file}: duplicate result ${key}`);
    recorded.add(key);
    if (!resume || !selected.includes(item.target) || !profiles.includes(item.profile)) continue;
    const target = targets.find(target => target.id === item.target);
    const requestedUrl = new URL(target.route, base).href;
    if (item.requestedUrl !== requestedUrl) throw new Error(`Cannot resume ${item.target}: missing or different requestedUrl (expected ${requestedUrl})`);
    if (item.phase !== phase || typeof item.file !== "string" || !item.file ||
        !item.scores || typeof item.scores !== "object" || Array.isArray(item.scores) || !Object.keys(item.scores).length ||
        !Object.values(item.scores).every(value => value === null || Number.isFinite(value)) ||
        !metricNames.every(name => Number.isFinite(item.metrics?.[name]))) {
      throw new Error(`Cannot resume incomplete result: ${key}`);
    }
  }
  return previousResults;
}

export async function main(args = process.argv.slice(2), { frontendDir = frontend, execute = runChild, log = console.log } = {}) {
  const options = parseOptions(args, { frontendDir });
  if (options.help) {
    log("Usage: npm run audit:projects -- [--name=value]\n\nOptions:\n  --phase=baseline         Report phase (lowercase letters, numbers, hyphens)\n  --profiles=mobile,desktop\n  --runs=1                 1–10 measurements per target and profile\n  --resume=true            Keep completed results and their warnings\n  --targets=contract-app   Comma-separated target IDs; default: all\n  --base-url=http://127.0.0.1:8765\n  --output=../runtime/lighthouse/projects (relative to frontend)\n  --list-targets           Print target IDs and routes\n  --help                   Print this help\n\nInstall optional measurement tools: npm --prefix tools/performance ci");
    return 0;
  }
  if (options.listTargets) {
    log(targets.map(target => `${target.id}\t${target.route}`).join("\n"));
    return 0;
  }
  const { phase, profiles, runs, resume, selected, base, output } = options;
  const summaryFile = path.join(output, `${phase}-summary.json`);
  const previousResults = await readSummary(summaryFile, options);
  const wrapper = path.join(frontendDir, "scripts/run-lighthouse.mjs");
  // Resume keeps completed runs exactly as recorded, including their warnings.
  // Fresh measurements replace a selection; surplus runs are removed in either mode.
  const results = previousResults.filter(item => !selected.includes(item.target) || !profiles.includes(item.profile) || (resume && item.run <= runs));
  const hasPendingMeasurements = selected.some(target => profiles.some(profile => {
    for (let run = 1; run <= runs; run++) {
      if (!results.some(item => item.target === target && item.profile === profile && item.run === run)) return true;
    }
    return false;
  }));
  // Check the optional tool before replacing summaries or archiving any report.
  // --version does not start Chrome; only the wrapper knows Lighthouse's location.
  if (hasPendingMeasurements) {
    const preflight = await execute([wrapper, "--version"], { cwd: frontendDir, stdio: ["ignore", "ignore", "inherit"] });
    if (preflight.code !== 0) throw new Error(`Lighthouse preflight failed (${preflight.signal || preflight.code}). Check the optional installation: npm --prefix tools/performance ci`);
  }
  await mkdir(output, { recursive: true });
  await writeFile(summaryFile, JSON.stringify(results, null, 2) + "\n");

  async function readReport(file) {
    const contents = await readFile(file, "utf8").catch(error => {
      if (error.code !== "ENOENT") throw error;
      return null;
    });
    if (contents === null) return null;
    try {
      return JSON.parse(contents);
    } catch (error) {
      return { runtimeError: { code: "INVALID_REPORT", message: error.message } };
    }
  }

  async function recordingHistory(file, requestedUrl) {
    const prefix = `${path.basename(file, ".json")}-failed-attempt-`;
    const archived = (await readdir(output)).flatMap(name => {
      if (!name.startsWith(prefix)) return [];
      const match = name.slice(prefix.length).match(/^(\d+)\.json$/);
      return match ? [{ file: name, attempt: Number(match[1]) }] : [];
    }).sort((a, b) => a.attempt - b.attempt);
    const failures = [];
    if (resume) {
      for (const entry of archived) {
        const report = await readReport(path.join(output, entry.file));
        if (report?.requestedUrl !== requestedUrl) throw new Error(`Cannot resume recording: missing or different requestedUrl in ${entry.file}`);
        failures.push({ ...entry, measuredAt: report.fetchTime, runtimeError: report.runtimeError || { code: "LIGHTHOUSE_EXIT", message: "Lighthouse exited unsuccessfully" } });
      }
    }
    let archiveNumber = archived.at(-1)?.attempt || 0;
    const preserve = async (report, executionError) => {
      const archivedFile = `${prefix}${++archiveNumber}.json`;
      await rename(file, path.join(output, archivedFile));
      const failure = { attempt: archiveNumber, file: archivedFile, measuredAt: report?.fetchTime,
        runtimeError: report?.runtimeError || executionError };
      failures.push(failure);
      return failure;
    };
    const existing = await readReport(file);
    if (existing?.runtimeError) {
      if (resume && existing.requestedUrl !== requestedUrl) throw new Error(`Cannot resume recording: missing or different requestedUrl in ${path.basename(file)}`);
      await preserve(existing);
      if (!resume) failures.pop();
    } else {
      // Prevent a child that produces no JSON from reusing an earlier report.
      await rm(file, { force: true });
    }
    return { failures, preserve };
  }

  // A single browser measurement at a time keeps CPU work and debugging ports isolated.
  for (const target of targets.filter(target => selected.includes(target.id))) {
    for (const profile of profiles) {
      for (let run = 1; run <= runs; run++) {
        if (results.some(item => item.target === target.id && item.profile === profile && item.run === run)) {
          log(JSON.stringify({ target: target.id, profile, run, resumed: true }));
          continue;
        }
        const file = path.join(output, `${target.id}-${phase}-${profile}-${run}.json`);
        const requestedUrl = new URL(target.route, base).href;
        const { failures: recordingFailures, preserve } = await recordingHistory(file, requestedUrl);
        const previousFailure = recordingFailures.find(failure => failure.runtimeError?.code !== "NO_NAVSTART");
        if (previousFailure) throw new Error(`${target.id}: ${previousFailure.runtimeError?.message}`);
        const childArgs = [wrapper, requestedUrl, "--output=json", `--output-path=${file}`, "--quiet"];
        if (profile === "desktop") childArgs.push("--preset=desktop");
        let report;
        while (recordingFailures.length < 3) {
          const { code, signal } = await execute(childArgs, { cwd: frontendDir, stdio: "inherit" });
          report = await readReport(file);
          const executionError = { code: "LIGHTHOUSE_EXIT", message: `Lighthouse exited ${signal || code}: ${target.id}` };
          if (!report) throw new Error(`${executionError.message}; no JSON report was produced`);
          if (report.runtimeError || code !== 0) {
            const failure = await preserve(report, executionError);
            if (failure.runtimeError.code !== "NO_NAVSTART") throw new Error(`${target.id}: ${failure.runtimeError.message}`);
            report = null;
            continue;
          }
          break;
        }
        if (!report) throw new Error(`${target.id}/${profile}/${run}: NO_NAVSTART after 3 recording attempts; failed JSON reports preserved`);
        const resources = report.audits["resource-summary"].details.items;
        const result = { target: target.id, route: target.route, phase, profile, run,
          requestedUrl: report.requestedUrl, finalUrl: report.finalDisplayedUrl || report.finalUrl,
          measuredAt: report.fetchTime, lighthouseVersion: report.lighthouseVersion,
          scores: Object.fromEntries(Object.entries(report.categories).map(([name, category]) => [name, category.score === null ? null : Math.round(category.score * 100)])),
          metrics: Object.fromEntries(metricNames.map(name => [name, report.audits[name].numericValue])),
          resources: resources.map(({ resourceType, requestCount, transferSize }) => ({ resourceType, requestCount, transferSize })),
          warnings: report.runWarnings, recordingFailures, file: path.basename(file) };
        const previous = results.findIndex(item => item.target === result.target && item.profile === profile && item.run === run);
        if (previous >= 0) results[previous] = result;
        else results.push(result);
        await writeFile(summaryFile, JSON.stringify(results, null, 2) + "\n");
        log(JSON.stringify({ target: target.id, profile, run, ...result.scores, lcp: Math.round(result.metrics["largest-contentful-paint"]), bytes: resources.find(item => item.resourceType === "total").transferSize }));
      }
    }
  }
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    process.exitCode = await main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
