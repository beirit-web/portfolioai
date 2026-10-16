import assert from "node:assert/strict";
import { access, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { main, parseOptions, targets } from "./audit-project-performance.mjs";

const metricNames = ["first-contentful-paint", "largest-contentful-paint", "total-blocking-time", "cumulative-layout-shift"];
const requestedUrl = "http://127.0.0.1:8765/wohnungssuche/";
const reportName = "housing-app-baseline-mobile-1.json";
const noop = () => {};

async function fixture(t) {
  const output = await mkdtemp(path.join(tmpdir(), "beirit-project-audit-"));
  t.after(() => rm(output, { recursive: true, force: true }));
  return {
    output, summary: path.join(output, "baseline-summary.json"),
    report: path.join(output, reportName),
    args: [`--output=${output}`, "--targets=housing-app", "--profiles=mobile"],
  };
}

function result(overrides = {}) {
  return {
    target: "housing-app", route: "/wohnungssuche/", phase: "baseline", profile: "mobile", run: 1,
    requestedUrl, scores: { performance: 98, pwa: null },
    metrics: Object.fromEntries(metricNames.map((name, index) => [name, index + 1])),
    warnings: ["An existing warning must remain visible"], file: reportName,
    ...overrides,
  };
}

function lighthouseReport(overrides = {}) {
  return {
    requestedUrl, finalDisplayedUrl: requestedUrl, fetchTime: "2026-01-01T12:00:00.000Z", lighthouseVersion: "13.0.0",
    categories: { performance: { score: 0.98 }, pwa: { score: null } },
    audits: {
      ...Object.fromEntries(metricNames.map((name, index) => [name, { numericValue: index + 1 }])),
      "resource-summary": { details: { items: [{ resourceType: "total", requestCount: 4, transferSize: 1234 }] } },
    },
    runWarnings: ["Measurement warning"],
    ...overrides,
  };
}

function fakeLighthouse(reports) {
  let measurements = 0;
  const execute = async (args) => {
    if (args[1] === "--version") return { code: 0, signal: null };
    const report = reports[Math.min(measurements++, reports.length - 1)];
    const output = args.find(arg => arg.startsWith("--output-path=")).slice("--output-path=".length);
    if (report) await writeFile(output, JSON.stringify(report));
    return { code: report?.runtimeError ? 1 : 0, signal: null };
  };
  return { execute, get measurements() { return measurements; } };
}

test("defaults use the active routes and a date-independent report directory", () => {
  const options = parseOptions([], { frontendDir: "/workspace/frontend" });
  assert.equal(options.output, "/workspace/runtime/lighthouse/projects");
  assert.equal(options.base, "http://127.0.0.1:8765");
  assert.deepEqual(options.profiles, ["mobile", "desktop"]);
  assert.deepEqual(options.selected, targets.map(target => target.id));
  assert.equal(targets.find(target => target.id === "housing-app").route, "/wohnungssuche/");
  assert.equal(targets.length, 14);
  assert.equal(new Set(targets.map(target => target.id)).size, targets.length);
});

test("existing --name=value options remain supported", () => {
  const options = parseOptions([
    "--phase=after-cleanup", "--profiles=desktop", "--runs=3", "--resume=true",
    "--targets=housing-app,contract-app", "--base-url=https://example.test:8443/", "--output=../reports",
  ], { frontendDir: "/workspace/frontend" });
  assert.equal(options.phase, "after-cleanup");
  assert.equal(options.runs, 3);
  assert.equal(options.resume, true);
  assert.equal(options.base, "https://example.test:8443");
  assert.equal(options.output, "/workspace/reports");
  assert.deepEqual(options.selected, ["housing-app", "contract-app"]);
});

test("invalid arguments fail before creating output or starting any child", async (t) => {
  const { output } = await fixture(t);
  const destination = path.join(output, "must-not-exist");
  const invalid = [
    ["--unknown=value"], ["targets=housing-app"], ["--runs"], ["--runs="], ["--phase= "],
    ["--phase=../other"], ["--runs=0"], ["--runs=11"], ["--runs=1.5"], ["--runs=1e0"],
    ["--runs=1", "--runs=2"], ["--resume=yes"], ["--profiles=mobile,mobile"],
    ["--profiles=tablet"], ["--profiles=mobile,"], ["--targets=unknown-app"],
    ["--targets=housing-app,housing-app"], ["--base-url=invalid"], ["--base-url=file:///tmp/"],
    ["--base-url=https://example.test/path"], ["--base-url=https://user:pass@example.test/"],
    ["--base-url=https://example.test/?q=1"], ["--base-url=https://example.test/#hash"],
    ["--help=true"], ["--list-targets=false"], ["--help", "--help"], ["--output="],
  ];
  for (const args of invalid) {
    let executed = false;
    await assert.rejects(main([`--output=${destination}`, ...args], {
      execute: async () => { executed = true; }, log: noop,
    }), Error, args.join(" "));
    assert.equal(executed, false, args.join(" "));
    await assert.rejects(access(destination), { code: "ENOENT" });
  }
});

test("help and target listing work without Lighthouse or output files", async (t) => {
  const { output } = await fixture(t);
  for (const flag of ["--help", "--list-targets"]) {
    const messages = [];
    const destination = path.join(output, flag.slice(2));
    assert.equal(await main([flag, `--output=${destination}`], {
      log: text => messages.push(text), execute: async () => assert.fail("must not launch Lighthouse"),
    }), 0);
    assert.ok(messages[0].includes(flag === "--help" ? "Usage:" : "housing-app\t/wohnungssuche/"));
    await assert.rejects(access(destination), { code: "ENOENT" });
  }
});

test("malformed summaries are rejected without replacement or tool startup", async (t) => {
  const { args, summary } = await fixture(t);
  for (const contents of ["{invalid", "{}", "[null]", JSON.stringify([{}]), JSON.stringify([result(), result()])]) {
    await writeFile(summary, contents);
    await assert.rejects(main(args, { execute: async () => assert.fail("must not launch Lighthouse"), log: noop }), /summary/);
    assert.equal(await readFile(summary, "utf8"), contents);
  }
});

test("resume refuses different URLs and incomplete selected measurements", async (t) => {
  const { args, summary } = await fixture(t);
  for (const [record, message] of [
    [result({ requestedUrl: "http://127.0.0.1:8765/static/portfolio/wohnungssuche/index.html" }), /different requestedUrl/],
    [result({ phase: "other" }), /incomplete/],
    [result({ metrics: {} }), /incomplete/],
    [result({ scores: [] }), /incomplete/],
    [result({ file: "" }), /incomplete/],
  ]) {
    const contents = JSON.stringify([record]);
    await writeFile(summary, contents);
    await assert.rejects(main([...args, "--resume=true"], {
      execute: async () => assert.fail("must not launch Lighthouse"), log: noop,
    }), message);
    assert.equal(await readFile(summary, "utf8"), contents);
  }
});

test("a missing optional tool leaves summaries and reports byte-for-byte intact", async (t) => {
  const { args, summary, report, output } = await fixture(t);
  const contents = JSON.stringify([result()]);
  await writeFile(summary, contents);
  await writeFile(report, "existing report\n");
  let calls = 0;
  const execute = async (childArgs) => {
    calls++;
    assert.equal(path.basename(childArgs[0]), "run-lighthouse.mjs");
    assert.deepEqual(childArgs.slice(1), ["--version"]);
    return { code: 1, signal: null };
  };
  await assert.rejects(main(args, { execute, log: noop }), /Lighthouse preflight failed/);
  assert.equal(calls, 1);
  assert.equal(await readFile(summary, "utf8"), contents);
  assert.equal(await readFile(report, "utf8"), "existing report\n");
  assert.deepEqual((await readdir(output)).sort(), ["baseline-summary.json", reportName].sort());
  const absent = path.join(output, "absent");
  await assert.rejects(main([`--output=${absent}`], { execute, log: noop }), /Lighthouse preflight failed/);
  await assert.rejects(access(absent), { code: "ENOENT" });
});

test("complete resume needs no optional tool and keeps warnings and unselected results", async (t) => {
  const { args, summary } = await fixture(t);
  const completed = result();
  const unselected = result({ target: "contract-app" });
  await writeFile(summary, JSON.stringify([completed, result({ run: 2 }), unselected]));
  assert.equal(await main([...args, "--resume=true"], {
    execute: async () => assert.fail("complete resume must not launch the optional tool"), log: noop,
  }), 0);
  assert.deepEqual(JSON.parse(await readFile(summary, "utf8")), [completed, unselected]);
});

test("incomplete resume checks the tool before changing any existing results", async (t) => {
  const { args, summary, report } = await fixture(t);
  const contents = JSON.stringify([result()]);
  await writeFile(summary, contents);
  await writeFile(report, "existing completed report\n");
  let preflights = 0;
  await assert.rejects(main([...args, "--resume=true", "--runs=2"], {
    execute: async (childArgs) => {
      preflights++;
      assert.deepEqual(childArgs.slice(1), ["--version"]);
      return { code: 1, signal: null };
    }, log: noop,
  }), /Lighthouse preflight failed/);
  assert.equal(preflights, 1);
  assert.equal(await readFile(summary, "utf8"), contents);
  assert.equal(await readFile(report, "utf8"), "existing completed report\n");
});

test("measurements record the active URL, warnings, metrics, and resources", async (t) => {
  const { args, summary } = await fixture(t);
  const fake = fakeLighthouse([lighthouseReport()]);
  await main(args, { execute: fake.execute, log: noop });
  const [measured] = JSON.parse(await readFile(summary, "utf8"));
  assert.equal(measured.requestedUrl, requestedUrl);
  assert.equal(measured.route, "/wohnungssuche/");
  assert.deepEqual(measured.scores, { performance: 98, pwa: null });
  assert.deepEqual(measured.metrics, result().metrics);
  assert.deepEqual(measured.warnings, ["Measurement warning"]);
  assert.equal(measured.resources[0].transferSize, 1234);
  assert.equal(fake.measurements, 1);
});

test("NO_NAVSTART retries preserve failed JSON reports and recording history", async (t) => {
  const { args, summary, output } = await fixture(t);
  const failure = lighthouseReport({ runtimeError: { code: "NO_NAVSTART", message: "No navigation start" } });
  const fake = fakeLighthouse([failure, failure, lighthouseReport()]);
  await main(args, { execute: fake.execute, log: noop });
  const [measured] = JSON.parse(await readFile(summary, "utf8"));
  assert.equal(fake.measurements, 3);
  assert.deepEqual(measured.recordingFailures.map(item => item.attempt), [1, 2]);
  for (const failed of measured.recordingFailures) {
    assert.deepEqual(JSON.parse(await readFile(path.join(output, failed.file), "utf8")), failure);
  }
});

test("NO_NAVSTART stops after three attempts without losing failed reports", async (t) => {
  const { args, summary, output } = await fixture(t);
  const fake = fakeLighthouse([lighthouseReport({ runtimeError: { code: "NO_NAVSTART", message: "No navigation start" } })]);
  await assert.rejects(main(args, { execute: fake.execute, log: noop }), /after 3 recording attempts/);
  assert.equal(fake.measurements, 3);
  assert.deepEqual(JSON.parse(await readFile(summary, "utf8")), []);
  assert.equal((await readdir(output)).filter(file => file.includes("failed-attempt-")).length, 3);
});

test("resuming incomplete recordings preserves prior failures and archive numbers", async (t) => {
  const { args, summary, report, output } = await fixture(t);
  const failure = lighthouseReport({ runtimeError: { code: "NO_NAVSTART", message: "No navigation start" } });
  const archive = report.replace(/\.json$/, "-failed-attempt-1.json");
  await writeFile(archive, JSON.stringify(failure));
  await writeFile(report, JSON.stringify(failure));
  const fake = fakeLighthouse([lighthouseReport()]);
  await main([...args, "--resume=true"], { execute: fake.execute, log: noop });
  const [measured] = JSON.parse(await readFile(summary, "utf8"));
  assert.equal(fake.measurements, 1);
  assert.deepEqual(measured.recordingFailures.map(item => item.attempt), [1, 2]);
  assert.equal((await readdir(output)).filter(file => file.includes("failed-attempt-")).length, 2);
});

test("other Lighthouse runtime errors are archived and are not retried", async (t) => {
  const { args, output } = await fixture(t);
  const fake = fakeLighthouse([lighthouseReport({ runtimeError: { code: "FAILED_DOCUMENT_REQUEST", message: "Document failed" } })]);
  await assert.rejects(main(args, { execute: fake.execute, log: noop }), /Document failed/);
  assert.equal(fake.measurements, 1);
  assert.equal((await readdir(output)).filter(file => file.includes("failed-attempt-")).length, 1);
});

test("a child producing no JSON cannot reuse a stale successful report", async (t) => {
  const { args, report } = await fixture(t);
  await writeFile(report, JSON.stringify(lighthouseReport()));
  const fake = fakeLighthouse([null]);
  await assert.rejects(main(args, { execute: fake.execute, log: noop }), /no JSON report was produced/);
  assert.equal(fake.measurements, 1);
  await assert.rejects(access(report), { code: "ENOENT" });
});
