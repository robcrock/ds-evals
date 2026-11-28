import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { applyScores } from "./scorers/index.ts";
import { parseCases } from "../src/dataset.ts";
import { createPiAgent } from "../src/pi-agent.ts";
import { runCase } from "../src/run-suite.ts";
import type { Score, ScoredResult } from "../src/types.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

loadEnv(join(root, ".env"));

if (!process.env.OPENAI_API_KEY) {
  console.error("OPENAI_API_KEY is not set in .env or the environment.");
  process.exit(1);
}

const cases = parseCases(JSON.parse(readFileSync(join(root, "evals/datasets/golden.json"), "utf8")));
const agent = createPiAgent(root);

console.log(`Running ${cases.length} label cases...\n`);

const results: ScoredResult[] = [];
for (const testCase of cases) {
  process.stdout.write(`[${testCase.id}] ${testCase.difficulty.padEnd(6)} `);
  const result = applyScores(testCase, await runCase(testCase, agent));
  results.push(result);
  if (result.error) {
    console.log(`ERROR: ${result.error}`);
  } else {
    const decision = result.decision;
    const visible = decision?.visibleText ?? "none";
    console.log(
      `${decision?.component} visible="${visible}" name="${decision?.accessibleName}" ${formatScores(result.scores)} (${result.durationMs}ms)`,
    );
  }
}

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const resultsDir = join(root, "evals/results");
mkdirSync(resultsDir, { recursive: true });
const outPath = join(resultsDir, `${timestamp}.json`);
writeFileSync(outPath, JSON.stringify(results, null, 2));

console.log(`\nResults written to ${outPath}`);
console.log('Schema, Component, and ForbiddenLabel are filled in. Set score to "pass" or "fail" and notes using evals/rubric.md.');
console.log(`\nErrors: ${results.filter((result) => result.error).length} / ${results.length}`);

function formatScores(scores: Score[]): string {
  return scores.map((score) => `${score.name}=${score.score}`).join(" ");
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
    const value = trimmed.slice(eq + 1).trim();
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}
