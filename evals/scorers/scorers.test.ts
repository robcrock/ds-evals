import assert from "node:assert/strict";
import test from "node:test";
import { scoreDecision } from "./index.ts";
import type { LabelDecision, TestCase } from "../../src/types.ts";

const buttonCase: TestCase = {
  id: "tc-01",
  input: "Save the form.",
  expectedCharacteristics: ["component is Button"],
  expectedComponent: "Button",
  difficulty: "simple",
  category: "action-or-navigation",
};

const decision: LabelDecision = {
  component: "Button",
  visibleText: "Save",
  accessibleName: "Save",
};

function scoreNamed(name: string, result: ReturnType<typeof scoreDecision>) {
  return result.find((score) => score.name === name);
}

test("schema scores a parsed decision as 1 and a missing decision as 0", () => {
  assert.equal(scoreNamed("Schema", scoreDecision(buttonCase, decision))?.score, 1);
  const missing = scoreNamed("Schema", scoreDecision(buttonCase, null));
  assert.equal(missing?.score, 0);
  assert.equal(missing?.metadata?.reason, "no label decision");
});

test("component scores a match as 1 and a mismatch as 0", () => {
  assert.equal(scoreNamed("Component", scoreDecision(buttonCase, decision))?.score, 1);
  const link: LabelDecision = { ...decision, component: "Link" };
  const mismatch = scoreNamed("Component", scoreDecision(buttonCase, link));
  assert.equal(mismatch?.score, 0);
  assert.equal(mismatch?.metadata?.expected, "Button");
  assert.equal(mismatch?.metadata?.actual, "Link");
});

test("component is omitted when the case does not pin a component", () => {
  const { expectedComponent: _expected, ...unpinned } = buttonCase;
  const scores = scoreDecision(unpinned, decision);
  assert.equal(scoreNamed("Component", scores), undefined);
});

test("forbidden label fails the exact lazy names and the phrase click here", () => {
  assert.equal(scoreNamed("ForbiddenLabel", scoreDecision(buttonCase, decision))?.score, 1);

  const submit: LabelDecision = { ...decision, visibleText: "Submit", accessibleName: "Submit" };
  const failed = scoreNamed("ForbiddenLabel", scoreDecision(buttonCase, submit));
  assert.equal(failed?.score, 0);
  assert.deepEqual(failed?.metadata?.hits, ["visibleText", "accessibleName"]);

  const phrase: LabelDecision = {
    component: "Button",
    visibleText: "Click here to save",
    accessibleName: "Save the form",
  };
  assert.equal(scoreNamed("ForbiddenLabel", scoreDecision(buttonCase, phrase))?.score, 0);

  const longer: LabelDecision = {
    component: "Button",
    visibleText: "Subscribe",
    accessibleName: "Subscribe",
  };
  assert.equal(scoreNamed("ForbiddenLabel", scoreDecision(buttonCase, longer))?.score, 1);
});

test("a missing decision fails every scorer that can run", () => {
  const scores = scoreDecision(buttonCase, null);
  assert.deepEqual(
    scores.map((score) => score.name),
    ["Schema", "Component", "ForbiddenLabel"],
  );
  assert.ok(scores.every((score) => score.score === 0));
});
