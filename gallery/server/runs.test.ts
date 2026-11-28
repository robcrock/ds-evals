import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { listRuns, parseUpdate, readRun, RunError, updateCase, type RunDirs } from "./runs.ts";
import type { ScoredResult } from "../../src/types.ts";

const sample = JSON.parse(
  readFileSync(new URL("../fixtures/sample-results.json", import.meta.url), "utf8"),
) as ScoredResult[];

function setup(resultFiles: string[] = []): RunDirs {
  const root = mkdtempSync(join(tmpdir(), "ds-evals-gallery-"));
  const dirs = { results: join(root, "results"), fixtures: join(root, "fixtures") };
  mkdirSync(dirs.results);
  mkdirSync(dirs.fixtures);
  writeFileSync(join(dirs.fixtures, "sample-results.json"), JSON.stringify(sample));
  for (const file of resultFiles) writeFileSync(join(dirs.results, file), JSON.stringify(sample));
  return dirs;
}

function rejects(fn: () => unknown, status: number) {
  assert.throws(fn, (error: unknown) => error instanceof RunError && error.status === status);
}

test("lists results newest first, then fixtures", () => {
  const dirs = setup(["2026-11-20T12-00-00-000Z.json", "2026-11-21T09-00-00-000Z.json", "notes.txt"]);
  const runs = listRuns(dirs);
  assert.deepEqual(
    runs.map((run) => [run.file, run.source]),
    [
      ["2026-11-21T09-00-00-000Z.json", "results"],
      ["2026-11-20T12-00-00-000Z.json", "results"],
      ["sample-results.json", "fixture"],
    ],
  );
  assert.equal(runs[0]?.cases, sample.length);
  assert.equal(runs[0]?.humanScored, 1);
});

test("falls back to fixtures when the results folder is missing", () => {
  const dirs = { ...setup(), results: join(tmpdir(), "ds-evals-does-not-exist") };
  assert.deepEqual(
    listRuns(dirs).map((run) => run.source),
    ["fixture"],
  );
  assert.equal(readRun(dirs, "sample-results.json").source, "fixture");
});

test("writes a pass or a fail and trims notes", () => {
  const dirs = setup(["run.json"]);
  assert.equal(parseUpdate({ score: "pass", notes: null }).score, "pass");
  const updated = updateCase(dirs, "run.json", "tc-09", { score: "fail", notes: "  Click here is forbidden.  " });
  assert.equal(updated.score, "fail");
  assert.equal(updated.notes, "Click here is forbidden.");

  const onDisk = JSON.parse(readFileSync(join(dirs.results, "run.json"), "utf8")) as ScoredResult[];
  assert.equal(onDisk.find((result) => result.testCaseId === "tc-09")?.score, "fail");
  assert.deepEqual(onDisk.find((result) => result.testCaseId === "tc-01"), sample[0]);
  assert.deepEqual(readdirSync(dirs.results), ["run.json"]);
});

test("clears a score and turns blank notes into null", () => {
  const dirs = setup(["run.json"]);
  const updated = updateCase(dirs, "run.json", "tc-01", { score: null, notes: "   " });
  assert.equal(updated.score, null);
  assert.equal(updated.notes, null);
});

test("rejects scores other than pass or fail, and bad notes", () => {
  for (const score of [0, 1, 2, 3, 4, 5, "Pass", "1", undefined]) rejects(() => parseUpdate({ score, notes: null }), 400);
  rejects(() => parseUpdate({ score: "pass", notes: 42 }), 400);
  rejects(() => parseUpdate({ score: "fail", notes: "x".repeat(2001) }), 400);
  rejects(() => parseUpdate(null), 400);
});

test("treats a Likert score as not scored", () => {
  const dirs = setup();
  const raw = JSON.parse(JSON.stringify(sample)) as Array<Record<string, unknown>>;
  raw[0]!.score = 5;
  raw[1]!.score = 1;
  writeFileSync(join(dirs.results, "legacy.json"), JSON.stringify(raw));

  const { results } = readRun(dirs, "legacy.json");
  assert.equal(results[0]?.score, null);
  assert.equal(results[1]?.score, null);

  const updated = updateCase(dirs, "legacy.json", "tc-05", { score: "fail", notes: "The name never says delete." });
  assert.equal(updated.score, "fail");
  const onDisk = JSON.parse(readFileSync(join(dirs.results, "legacy.json"), "utf8")) as ScoredResult[];
  assert.equal(onDisk.find((result) => result.testCaseId === "tc-01")?.score, null);
  assert.equal(onDisk.find((result) => result.testCaseId === "tc-05")?.score, "fail");
});

test("rejects path traversal and non-json names", () => {
  const dirs = setup(["run.json"]);
  for (const file of ["../run.json", "..%2Frun.json", "/etc/passwd", ".hidden.json", "run.txt", "a/b.json"]) {
    rejects(() => updateCase(dirs, file, "tc-01", { score: "pass", notes: null }), 400);
    rejects(() => readRun(dirs, file), 400);
  }
});

test("fixtures are read-only and unknown cases are 404", () => {
  const dirs = setup(["run.json"]);
  rejects(() => updateCase(dirs, "sample-results.json", "tc-01", { score: "pass", notes: null }), 404);
  rejects(() => updateCase(dirs, "run.json", "tc-99", { score: "fail", notes: null }), 404);
  rejects(() => readRun(dirs, "missing.json"), 404);
});
