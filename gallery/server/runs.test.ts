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

test("writes score and trimmed notes into the results file", () => {
  const dirs = setup(["run.json"]);
  const updated = updateCase(dirs, "run.json", "tc-09", { score: 2, notes: "  Click here is forbidden.  " });
  assert.equal(updated.score, 2);
  assert.equal(updated.notes, "Click here is forbidden.");

  const onDisk = JSON.parse(readFileSync(join(dirs.results, "run.json"), "utf8")) as ScoredResult[];
  assert.equal(onDisk.find((result) => result.testCaseId === "tc-09")?.score, 2);
  assert.deepEqual(onDisk.find((result) => result.testCaseId === "tc-01"), sample[0]);
  assert.deepEqual(readdirSync(dirs.results), ["run.json"]);
});

test("clears a score and turns blank notes into null", () => {
  const dirs = setup(["run.json"]);
  const updated = updateCase(dirs, "run.json", "tc-01", { score: null, notes: "   " });
  assert.equal(updated.score, null);
  assert.equal(updated.notes, null);
});

test("rejects scores outside 1 to 5 and bad notes", () => {
  for (const score of [0, 6, 2.5, "3", undefined]) rejects(() => parseUpdate({ score, notes: null }), 400);
  rejects(() => parseUpdate({ score: 3, notes: 42 }), 400);
  rejects(() => parseUpdate({ score: 3, notes: "x".repeat(2001) }), 400);
  rejects(() => parseUpdate(null), 400);
});

test("rejects path traversal and non-json names", () => {
  const dirs = setup(["run.json"]);
  for (const file of ["../run.json", "..%2Frun.json", "/etc/passwd", ".hidden.json", "run.txt", "a/b.json"]) {
    rejects(() => updateCase(dirs, file, "tc-01", { score: 3, notes: null }), 400);
    rejects(() => readRun(dirs, file), 400);
  }
});

test("fixtures are read-only and unknown cases are 404", () => {
  const dirs = setup(["run.json"]);
  rejects(() => updateCase(dirs, "sample-results.json", "tc-01", { score: 3, notes: null }), 404);
  rejects(() => updateCase(dirs, "run.json", "tc-99", { score: 3, notes: null }), 404);
  rejects(() => readRun(dirs, "missing.json"), 404);
});
