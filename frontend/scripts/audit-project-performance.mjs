import { spawn } from "node:child_process";
import { mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const frontend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const projects = ["vertragsgenerator", "online-shop", "enbt-botanic", "wohnungssuche-bodensee", "notenrechner", "sprachdienstleistungen"];
const targets = [
  { id: "contract-app", route: "/vertragsgenerator/" },
  { id: "shop-app", route: "/shop/" },
  { id: "botanic-app", route: "/botanic/" },
  { id: "weather-app", route: "/botanic/wetter/" },
  { id: "housing-app", route: "/static/portfolio/wohnungssuche/index.html" },
  { id: "grades-app", route: "/static/portfolio/notenrechner/index.html" },
  { id: "language-app", route: "/deutschlive/" },
  { id: "vocabulary-app", route: "/vokabelbox/" },
  ...projects.map(slug => ({ id: `${slug}-report`, route: `/projekte/${slug}` })),
];
const options = Object.fromEntries(process.argv.slice(2).map(arg => {
  if (!arg.startsWith("--") || !arg.includes("=")) throw new Error(`Use --name=value: ${arg}`);
  const equals = arg.indexOf("=");
  return [arg.slice(2, equals), arg.slice(equals + 1)];
}));
const phase = options.phase || "baseline";
if (!/^[a-z0-9-]+$/.test(phase)) throw new Error("Invalid phase name");
const profiles = (options.profiles || "mobile,desktop").split(",");
if (profiles.some(profile => !["mobile", "desktop"].includes(profile))) throw new Error("Invalid profile");
const runs = Number(options.runs || 1);
if (!Number.isInteger(runs) || runs < 1 || runs > 10) throw new Error("Use 1–10 runs");
if (options.resume !== undefined && !["true", "false"].includes(options.resume)) throw new Error("Use --resume=true or --resume=false");
const resume = options.resume === "true";
const selected = options.targets ? options.targets.split(",") : targets.map(target => target.id);
if (selected.some(id => !targets.some(target => target.id === id))) throw new Error("Unknown target");
const base = options["base-url"] || "http://127.0.0.1:8765";
const output = path.resolve(frontend, options.output || "../runtime/lighthouse/projects-2026-10-11");
await mkdir(output, { recursive: true });
const summaryFile = path.join(output, `${phase}-summary.json`);
const previousResults = JSON.parse(await readFile(summaryFile, "utf8").catch(error => {
  if (error.code !== "ENOENT") throw error;
  return "[]";
}));
const metricNames = ["first-contentful-paint", "largest-contentful-paint", "total-blocking-time", "cumulative-layout-shift"];
if (resume) {
  for (const item of previousResults.filter(item => selected.includes(item.target) && profiles.includes(item.profile))) {
    const target = targets.find(target => target.id === item.target);
    const requestedUrl = new URL(target.route, base).href;
    if (item.requestedUrl !== requestedUrl) throw new Error(`Cannot resume ${item.target}: missing or different requestedUrl (expected ${requestedUrl})`);
    if (item.phase !== phase || !Number.isInteger(item.run) || item.run < 1 || !item.file || !item.scores ||
        !metricNames.every(name => Number.isFinite(item.metrics?.[name]))) {
      throw new Error(`Cannot resume incomplete result: ${item.target}/${item.profile}/${item.run}`);
    }
  }
}
// Resume keeps completed runs exactly as recorded, including their warnings.
// Fresh measurements replace a selection; surplus runs are removed in either mode.
const results = previousResults.filter(item => !selected.includes(item.target) || !profiles.includes(item.profile) || (resume && item.run <= runs));
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
    const failure = await preserve(existing);
    if (resume && existing.requestedUrl !== requestedUrl) throw new Error(`Cannot resume recording: missing or different requestedUrl in ${failure.file}`);
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
        console.log(JSON.stringify({ target: target.id, profile, run, resumed: true }));
        continue;
      }
      const file = path.join(output, `${target.id}-${phase}-${profile}-${run}.json`);
      const requestedUrl = new URL(target.route, base).href;
      const { failures: recordingFailures, preserve } = await recordingHistory(file, requestedUrl);
      const previousFailure = recordingFailures.find(failure => failure.runtimeError?.code !== "NO_NAVSTART");
      if (previousFailure) throw new Error(`${target.id}: ${previousFailure.runtimeError?.message}`);
      const args = [path.join(frontend, "scripts/run-lighthouse.mjs"), requestedUrl,
        "--output=json", `--output-path=${file}`, "--quiet"];
      if (profile === "desktop") args.push("--preset=desktop");
      let report;
      while (recordingFailures.length < 3) {
        const { code, signal } = await new Promise((resolve, reject) => {
          const child = spawn(process.execPath, args, { cwd: frontend, stdio: "inherit" });
          child.once("error", reject);
          child.once("exit", (code, signal) => resolve({ code, signal }));
        });
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
      console.log(JSON.stringify({ target: target.id, profile, run, ...result.scores, lcp: Math.round(result.metrics["largest-contentful-paint"]), bytes: resources.find(item => item.resourceType === "total").transferSize }));
    }
  }
}
