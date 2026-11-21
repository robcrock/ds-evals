import type { LabelDecision, Score } from "../../src/types.ts";

const EXACT = new Set(["click here", "here", "submit", "ok"]);

export function forbiddenLabelScore(decision: LabelDecision | null): Score {
  if (!decision) {
    return { name: "ForbiddenLabel", score: 0, metadata: { reason: "no label decision" } };
  }

  const hits: string[] = [];
  if (isForbidden(decision.visibleText)) hits.push("visibleText");
  if (isForbidden(decision.accessibleName)) hits.push("accessibleName");

  if (hits.length === 0) return { name: "ForbiddenLabel", score: 1 };
  return { name: "ForbiddenLabel", score: 0, metadata: { hits } };
}

function isForbidden(value: string | null): boolean {
  if (value === null) return false;
  const normalized = value.trim().toLowerCase().replace(/[.!?]+$/g, "").trim();
  return EXACT.has(normalized) || normalized.includes("click here");
}
