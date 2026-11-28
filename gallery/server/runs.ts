import { existsSync, readdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ScoredResult } from "../../src/types.ts";

export type RunSource = "results" | "fixture";

export interface RunSummary {
  file: string;
  source: RunSource;
  cases: number;
  humanScored: number;
}

export interface RunDirs {
  results: string;
  fixtures: string;
}

export interface CaseUpdate {
  score: ScoredResult["score"];
  notes: string | null;
}

export class RunError extends Error {
  constructor(
    readonly status: 400 | 404,
    message: string,
  ) {
    super(message);
  }
}

const FILE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*\.json$/;
const MAX_NOTES = 2000;

// Newest results first, then the committed fixtures so the gallery works before any `pnpm eval`.
export function listRuns(dirs: RunDirs): RunSummary[] {
  const results = jsonFiles(dirs.results).sort().reverse();
  const fixtures = jsonFiles(dirs.fixtures).sort();
  return [
    ...results.map((file) => summarize(dirs, file, "results")),
    ...fixtures.map((file) => summarize(dirs, file, "fixture")),
  ];
}

export function readRun(dirs: RunDirs, file: string): { source: RunSource; results: ScoredResult[] } {
  const source = locate(dirs, file);
  return { source, results: readResults(join(dirs[sourceDir(source)], file)) };
}

// Only results files are writable. Fixtures are committed and stay read-only.
export function updateCase(dirs: RunDirs, file: string, caseId: string, body: unknown): ScoredResult {
  assertFileName(file);
  const path = join(dirs.results, file);
  if (!existsSync(path)) throw new RunError(404, `No results file named ${file}`);

  const update = parseUpdate(body);
  const results = readResults(path);
  const target = results.find((result) => result.testCaseId === caseId);
  if (!target) throw new RunError(404, `No case ${caseId} in ${file}`);

  target.score = update.score;
  target.notes = update.notes;

  const temp = `${path}.${process.pid}.tmp`;
  writeFileSync(temp, JSON.stringify(results, null, 2));
  renameSync(temp, path);
  return target;
}

export function parseUpdate(body: unknown): CaseUpdate {
  if (typeof body !== "object" || body === null) throw new RunError(400, "Body must be a JSON object.");
  const { score, notes } = body as Record<string, unknown>;

  if (score !== "pass" && score !== "fail" && score !== null) {
    throw new RunError(400, 'score must be "pass", "fail", or null.');
  }
  if (notes !== null && typeof notes !== "string") throw new RunError(400, "notes must be a string or null.");
  if (typeof notes === "string" && notes.length > MAX_NOTES) {
    throw new RunError(400, `notes must be at most ${MAX_NOTES} characters.`);
  }

  const trimmed = typeof notes === "string" ? notes.trim() : null;
  return { score, notes: trimmed ? trimmed : null };
}

function locate(dirs: RunDirs, file: string): RunSource {
  assertFileName(file);
  if (existsSync(join(dirs.results, file))) return "results";
  if (existsSync(join(dirs.fixtures, file))) return "fixture";
  throw new RunError(404, `No run named ${file}`);
}

function assertFileName(file: string): void {
  if (!FILE_NAME.test(file)) throw new RunError(400, `Invalid run file name: ${file}`);
}

function sourceDir(source: RunSource): keyof RunDirs {
  return source === "results" ? "results" : "fixtures";
}

function summarize(dirs: RunDirs, file: string, source: RunSource): RunSummary {
  const results = readResults(join(dirs[sourceDir(source)], file));
  return { file, source, cases: results.length, humanScored: results.filter((result) => result.score !== null).length };
}

function readResults(path: string): ScoredResult[] {
  const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
  if (!Array.isArray(parsed)) throw new RunError(400, "Results file must contain an array.");
  // A 1–5 score is not a pass or a fail. Drop it so an old 1 is not kept as a judgment.
  for (const item of parsed) {
    if (typeof item === "object" && item !== null && "score" in item) {
      (item as ScoredResult).score = humanScore((item as { score: unknown }).score);
    }
  }
  return parsed as ScoredResult[];
}

function humanScore(score: unknown): ScoredResult["score"] {
  if (score === "pass" || score === "fail") return score;
  return null;
}

function jsonFiles(directory: string): string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory).filter((name) => FILE_NAME.test(name));
}
