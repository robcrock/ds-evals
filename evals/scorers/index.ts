import { componentScore } from "./component.ts";
import { forbiddenLabelScore } from "./forbidden-label.ts";
import { schemaScore } from "./schema.ts";
import type { EvalResult, LabelDecision, Score, ScoredResult, TestCase } from "../../src/types.ts";

export function scoreDecision(testCase: TestCase, decision: LabelDecision | null): Score[] {
  return [schemaScore(decision), componentScore(testCase, decision), forbiddenLabelScore(decision)].filter(
    (score): score is Score => score !== null,
  );
}

export function applyScores(testCase: TestCase, result: EvalResult): ScoredResult {
  return { ...result, scores: scoreDecision(testCase, result.decision) };
}
