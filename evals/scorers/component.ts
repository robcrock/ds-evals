import type { LabelDecision, Score, TestCase } from "../../src/types.ts";

export function componentScore(testCase: TestCase, decision: LabelDecision | null): Score | null {
  if (!testCase.expectedComponent) return null;
  if (!decision) {
    return {
      name: "Component",
      score: 0,
      metadata: { reason: "no label decision", expected: testCase.expectedComponent },
    };
  }
  const matched = decision.component === testCase.expectedComponent;
  return {
    name: "Component",
    score: matched ? 1 : 0,
    metadata: { expected: testCase.expectedComponent, actual: decision.component },
  };
}
