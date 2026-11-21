import assert from "node:assert/strict";
import test from "node:test";
import { parseDecision } from "./task.ts";

test("parseDecision reads a raw JSON object", () => {
  const decision = parseDecision(
    '{"component":"Button","visibleText":"Save","accessibleName":"Save"}',
  );
  assert.deepEqual(decision, {
    component: "Button",
    visibleText: "Save",
    accessibleName: "Save",
  });
});

test("parseDecision reads JSON inside a fence", () => {
  const decision = parseDecision(
    'Here you go.\n```json\n{"component":"Link","visibleText":"Billing","accessibleName":"Billing"}\n```\n',
  );
  assert.equal(decision?.component, "Link");
});

test("parseDecision trims the text it keeps", () => {
  const decision = parseDecision(
    '{"component":"Button","visibleText":" Save ","accessibleName":" Save "}',
  );
  assert.equal(decision?.visibleText, "Save");
  assert.equal(decision?.accessibleName, "Save");
});

test("parseDecision allows a null visible text for an icon-only control", () => {
  const decision = parseDecision(
    '{"component":"Button","visibleText":null,"accessibleName":"Delete row"}',
  );
  assert.equal(decision?.visibleText, null);
  assert.equal(decision?.accessibleName, "Delete row");
});

test("parseDecision rejects a forbidden shape", () => {
  assert.equal(parseDecision('{"component":"Card","visibleText":"Save","accessibleName":"Save"}'), null);
  assert.equal(parseDecision('{"component":"Button","visibleText":"","accessibleName":"Save"}'), null);
  assert.equal(parseDecision('{"component":"Button","visibleText":"Save","accessibleName":"  "}'), null);
  assert.equal(parseDecision("I would use a button."), null);
});
