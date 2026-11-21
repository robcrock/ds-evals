import { readdirSync, readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { init } from "braintrust";
import type { Score } from "../src/types.ts";

const PROJECT = "DS evals";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");

loadEnv(join(root, ".env"));

if (!process.env.BRAINTRUST_API_KEY) {
  console.error("BRAINTRUST_API_KEY is not set in .env or the environment.");
  process.exit(1);
}

const resultsPath = process.argv[2] ?? newestResults(join(root, "evals/results"));
const results = JSON.parse(readFileSync(resultsPath, "utf8")) as LoggedResult[];
const experimentName = `label-decisions-${basename(resultsPath, ".json")}`;

const experiment = init(PROJECT, {
  experiment: experimentName,
  description: "Logged label-decision run. Schema, Component, and ForbiddenLabel are automatic.",
});

for (const result of results) {
  experiment.log({
    input: result.input,
    output: result.decision ?? result.response,
    expected: result.expectedCharacteristics,
    scores: Object.fromEntries((result.scores ?? []).map((score) => [score.name, score.score])),
    metadata: {
      id: result.testCaseId,
      difficulty: result.difficulty,
      category: result.category,
      modelId: result.modelId,
      durationMs: result.durationMs,
      error: result.error ?? null,
    },
    tags: [result.difficulty, result.category],
  });
}

const summary = await experiment.summarize();
console.log(`Project: ${PROJECT}`);
console.log(`Experiment: ${experimentName}`);
console.log(`Rows: ${results.length}`);
console.log(formatLink(summary));

interface LoggedResult {
  testCaseId: string;
  input: string;
  expectedCharacteristics: string[];
  difficulty: string;
  category: string;
  response: string;
  decision: unknown;
  modelId: string;
  durationMs: number;
  error?: string;
  scores?: Score[];
}

function newestResults(directory: string): string {
  const files = readdirSync(directory)
    .filter((name) => name.endsWith(".json"))
    .sort();
  const latest = files.at(-1);
  if (!latest) throw new Error(`No results JSON in ${directory}`);
  return join(directory, latest);
}

function formatLink(summary: unknown): string {
  if (typeof summary !== "object" || summary === null) return String(summary);
  const record = summary as Record<string, unknown>;
  const link = record.experimentUrl ?? record.projectUrl ?? record.url;
  if (typeof link === "string") return link;
  return JSON.stringify(summary, null, 2);
}

function loadEnv(path: string): void {
  let content: string;
  try {
    content = readFileSync(path, "utf8");
  } catch {
    return;
  }
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}
