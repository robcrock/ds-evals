import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { checksNote, meetsExpectation } from "./expectations.ts";
import type { LabelDecision } from "../../src/types.ts";

const golden = JSON.parse(readFileSync(new URL("../../evals/datasets/golden.json", import.meta.url), "utf8")) as {
  id: string;
  expectedCharacteristics: string[];
}[];

const decisions: Record<string, LabelDecision> = {
  "tc-01": { component: "Button", visibleText: "Save settings", accessibleName: "Save settings" },
  "tc-02": { component: "Button", visibleText: "Discard changes", accessibleName: "Discard changes" },
  "tc-03": { component: "Link", visibleText: "Billing", accessibleName: "Billing" },
  "tc-04": { component: "Button", visibleText: "Skip this step", accessibleName: "Skip this step" },
  "tc-05": { component: "Button", visibleText: null, accessibleName: "Delete row" },
  "tc-06": { component: "Link", visibleText: "Pricing guide", accessibleName: "Pricing guide" },
  "tc-07": { component: "Button", visibleText: "Permanently delete project", accessibleName: "Permanently delete project" },
  "tc-08": { component: "Button", visibleText: null, accessibleName: "Open settings" },
  "tc-09": { component: "Link", visibleText: "Learn more", accessibleName: "Learn more" },
  "tc-10": { component: "Button", visibleText: "Sign up for the newsletter", accessibleName: "Sign up for the newsletter" },
  "tc-11": { component: "Button", visibleText: "Add a button", accessibleName: "Add a button" },
  "tc-12": { component: "Button", visibleText: "Rainbow gradient", accessibleName: "Rainbow gradient" },
};

test("every golden characteristic has a rule", () => {
  for (const item of golden) {
    const decision = decisions[item.id];
    assert.ok(decision, item.id);
    for (const line of item.expectedCharacteristics) {
      assert.equal(typeof meetsExpectation(line, decision), "boolean", `${item.id}: ${line}`);
    }
  }
});

test("a save control meets its expectations, and a rainbow label misses the last one", () => {
  const save = decisions["tc-01"] ?? null;
  assert.equal(meetsExpectation("component is Button", save), true);
  assert.equal(meetsExpectation("visible text names the save action, such as Save", save), true);
  assert.equal(meetsExpectation("accessible name matches the visible text", save), true);

  const rainbow = decisions["tc-12"] ?? null;
  assert.equal(meetsExpectation("visible text is not Click here", rainbow), true);
  assert.equal(meetsExpectation("the decision does not describe a rainbow gradient as the label", rainbow), false);
});

test("click here misses the docs destination and still matches its own name", () => {
  const decision: LabelDecision = { component: "Link", visibleText: "Click here", accessibleName: "Click here" };
  assert.equal(meetsExpectation("component is Link", decision), true);
  assert.equal(meetsExpectation("visible text names the docs destination, such as Learn more", decision), false);
  assert.equal(meetsExpectation("the decision does not describe Save", decision), true);
  assert.equal(meetsExpectation("accessible name matches the visible text", decision), true);
});

test("no decision misses every expectation, and an unknown line stays unmarked", () => {
  assert.equal(meetsExpectation("component is Button", null), false);
  assert.equal(meetsExpectation("the control feels friendly", decisions["tc-01"] ?? null), null);
});

test("checks collapse to a count, or the names that missed", () => {
  assert.equal(checksNote([]), null);
  assert.equal(
    checksNote([
      { name: "Schema", score: 1 },
      { name: "Component", score: 1 },
      { name: "ForbiddenLabel", score: 1 },
    ]),
    "3 checks passed",
  );
  assert.equal(
    checksNote([
      { name: "Schema", score: 1 },
      { name: "Component", score: 1 },
      { name: "ForbiddenLabel", score: 0 },
    ]),
    "ForbiddenLabel missed",
  );
});
