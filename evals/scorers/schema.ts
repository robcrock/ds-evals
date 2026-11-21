import type { LabelDecision, Score } from "../../src/types.ts";

export function schemaScore(decision: LabelDecision | null): Score {
  if (!decision) {
    return { name: "Schema", score: 0, metadata: { reason: "no label decision" } };
  }
  return { name: "Schema", score: 1 };
}
