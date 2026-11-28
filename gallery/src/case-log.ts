import type { LabelDecision, Score, ScoredResult } from "../../src/types.ts";
import { meetsExpectation } from "./expectations.ts";

export const SPAN_IDS = ["prompt", "model", "parse", "render", "checks", "judgment"] as const;
export type SpanId = (typeof SPAN_IDS)[number];

export function formatDuration(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)}\u00a0s`;
  return `${ms}\u00a0ms`;
}

export function shortModel(modelId: string): string {
  const slash = modelId.lastIndexOf("/");
  return slash === -1 ? modelId : modelId.slice(slash + 1);
}

export function spanWhen(result: ScoredResult, id: SpanId): string {
  if (id === "prompt") return "0\u00a0ms";
  if (id === "render") return "Gallery";
  if (id === "judgment") return "Later";
  return formatDuration(result.durationMs);
}

export function spanMiss(result: ScoredResult, id: SpanId): boolean {
  if (id === "parse") return result.decision === null;
  if (id === "render") return result.decision === null || namesDiffer(result.decision);
  if (id === "checks") return checksMiss(result);
  if (id === "judgment") return result.score === "fail";
  return false;
}

export function spanStatus(result: ScoredResult, id: SpanId): "error" | undefined {
  return spanMiss(result, id) ? "error" : undefined;
}

export function spanTitle(result: ScoredResult, id: SpanId): string {
  if (id === "prompt") return "Read the case prompt.";
  if (id === "model") return `Replied with ${shortModel(result.modelId)}.`;
  if (id === "parse") {
    if (!result.decision) return "Failed to parse a label decision.";
    return `Parsed a ${result.decision.component} decision.`;
  }
  if (id === "render") {
    if (!result.decision) return "Did not render a control.";
    if (namesDiffer(result.decision)) return "Rendered a control with a mismatched accessible name.";
    return "Rendered the control and read its accessible name.";
  }
  if (id === "checks") return checksTitle(result);
  if (result.score === "fail") return "Marked the case as a fail.";
  if (result.score === "pass") return "Marked the case as a pass.";
  return "Left the case unscored.";
}

export function openingSpan(result: ScoredResult): SpanId {
  if (!result.decision) return "parse";
  if (spanMiss(result, "checks")) return "checks";
  if (result.score === "fail") return "judgment";
  return "model";
}

export function checkDetail(score: Score): string {
  const meta = score.metadata ?? {};
  if (score.name === "Schema") {
    return score.score === 1 ? "The reply parsed into a label decision." : "No label decision.";
  }
  if (score.name === "Component") {
    const expected = typeof meta.expected === "string" ? meta.expected : "a component";
    const actual = typeof meta.actual === "string" ? meta.actual : null;
    if (!actual) return `Expected ${expected}. No decision.`;
    return `Expected ${expected}. Got ${actual}.`;
  }
  if (score.name === "ForbiddenLabel") {
    if (score.score === 1) return "Neither label is Click here, Here, Submit, or OK.";
    const hits = Array.isArray(meta.hits) ? meta.hits.filter((item) => typeof item === "string") : [];
    if (hits.length === 1) return `${hits[0]} is a forbidden label.`;
    if (hits.length > 1) return `${hits.join(" and ")} are forbidden labels.`;
    return "A label is Click here, Here, Submit, or OK.";
  }
  return score.score === 1 ? "Passed." : "Missed.";
}

export function characteristicMet(result: ScoredResult, line: string): boolean | null {
  return meetsExpectation(line, result.decision);
}

function namesDiffer(decision: LabelDecision): boolean {
  if (decision.visibleText === null) return false;
  return decision.visibleText !== decision.accessibleName;
}

function checksMiss(result: ScoredResult): boolean {
  if (result.scores.some((score) => score.score !== 1)) return true;
  return result.expectedCharacteristics.some((line) => meetsExpectation(line, result.decision) === false);
}

function checksTitle(result: ScoredResult): string {
  if (checksMiss(result)) return "Failed a check.";
  const unknown = result.expectedCharacteristics.some((line) => meetsExpectation(line, result.decision) === null);
  if (unknown) return "Checked the lines that have a rule.";
  return "Passed every check.";
}
