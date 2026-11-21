import assert from "node:assert/strict";
import test from "node:test";
import { runCase } from "./run-suite.ts";
import type { Agent, TestCase } from "./types.ts";

const saveCase: TestCase = {
  id: "tc-01",
  input: "The main control on a settings form saves the form.",
  expectedCharacteristics: ["component is Button", "visible text names the save action"],
  difficulty: "simple",
  category: "action-or-navigation",
};

test("runCase stores a parsed decision from the agent", async () => {
  const agent: Agent = {
    async complete() {
      return {
        response: '{"component":"Button","visibleText":"Save","accessibleName":"Save"}',
        modelId: "openai/gpt-test",
      };
    },
  };

  const result = await runCase(saveCase, agent);
  assert.equal(result.testCaseId, "tc-01");
  assert.equal(result.modelId, "openai/gpt-test");
  assert.equal(result.decision?.visibleText, "Save");
  assert.equal(result.error, undefined);
  assert.equal(result.score, null);
  assert.equal(result.notes, null);
  assert.deepEqual(result.expectedCharacteristics, saveCase.expectedCharacteristics);
});

test("runCase records a parse failure without inventing a decision", async () => {
  const agent: Agent = {
    async complete() {
      return { response: "A button that says Save.", modelId: "openai/gpt-test" };
    },
  };

  const result = await runCase(saveCase, agent);
  assert.equal(result.decision, null);
  assert.equal(result.error, "Response did not include a label decision.");
  assert.equal(result.response, "A button that says Save.");
});

test("runCase keeps an agent error and a null decision", async () => {
  const agent: Agent = {
    async complete() {
      return { response: "", modelId: "openai/gpt-test", error: "missing api key" };
    },
  };

  const result = await runCase(saveCase, agent);
  assert.equal(result.decision, null);
  assert.equal(result.error, "missing api key");
});
