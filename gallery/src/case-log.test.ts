import assert from "node:assert/strict";
import test from "node:test";
import { openingSpan, spanTitle } from "./case-log.ts";
import type { ScoredResult } from "../../src/types.ts";

function result(patch: Partial<ScoredResult>): ScoredResult {
  return {
    testCaseId: "tc-01",
    input: "Save the form.",
    expectedCharacteristics: ["component is Button"],
    difficulty: "simple",
    category: "action-or-navigation",
    response: "{}",
    decision: { component: "Button", visibleText: "Save", accessibleName: "Save" },
    modelId: "openai/gpt-4.1",
    durationMs: 640,
    score: "pass",
    notes: null,
    scores: [
      { name: "Schema", score: 1 },
      { name: "Component", score: 1, metadata: { expected: "Button", actual: "Button" } },
    ],
    ...patch,
  };
}

test("a missing decision opens the parse row", () => {
  const item = result({ decision: null, error: "Response did not include a label decision." });
  assert.equal(openingSpan(item), "parse");
  assert.equal(spanTitle(item, "parse"), "Failed to parse a label decision.");
});

test("a missed check opens the checks row", () => {
  const item = result({
    scores: [{ name: "Component", score: 0, metadata: { expected: "Link", actual: "Button" } }],
  });
  assert.equal(openingSpan(item), "checks");
  assert.equal(spanTitle(item, "checks"), "Failed a check.");
});

test("a failed judgment opens when the checks passed", () => {
  const item = result({ score: "fail" });
  assert.equal(openingSpan(item), "judgment");
  assert.equal(spanTitle(item, "judgment"), "Marked the case as a fail.");
});

test("a pass opens the model reply", () => {
  const item = result({});
  assert.equal(openingSpan(item), "model");
  assert.equal(spanTitle(item, "model"), "Replied with gpt-4.1.");
});
