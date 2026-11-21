import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { parseCases } from "./dataset.ts";

test("parseCases rejects a dataset that is not a list of cases", () => {
  assert.throws(() => parseCases({ id: "tc-01" }), /array/);
  assert.throws(() => parseCases([{ id: "tc-01" }]), /tc-01/);
  assert.throws(
    () =>
      parseCases([
        {
          id: "tc-01",
          input: "Save the form.",
          expectedCharacteristics: ["component is Button"],
          difficulty: "simple",
          category: "visible-text",
        },
        {
          id: "tc-01",
          input: "Save the form again.",
          expectedCharacteristics: ["component is Button"],
          difficulty: "simple",
          category: "visible-text",
        },
      ]),
    /duplicate/,
  );
});

test("the golden file is a twelve-case label suite", () => {
  const raw: unknown = JSON.parse(readFileSync(new URL("../evals/datasets/golden.json", import.meta.url), "utf8"));
  const cases = parseCases(raw);
  assert.equal(cases.length, 12);
  assert.ok(cases.every((item) => item.expectedComponent === "Button" || item.expectedComponent === "Link"));
  for (const difficulty of ["simple", "medium", "hard", "edge"] as const) {
    assert.ok(cases.some((item) => item.difficulty === difficulty), difficulty);
  }
});
