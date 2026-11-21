import { parseDecision } from "./task.ts";
import type { Agent, EvalResult, TestCase } from "./types.ts";

const PARSE_ERROR = "Response did not include a label decision.";

export async function runCase(testCase: TestCase, agent: Agent): Promise<EvalResult> {
  const start = Date.now();
  try {
    const completion = await agent.complete(testCase.input);
    const decision = completion.error ? null : parseDecision(completion.response);
    return {
      ...fields(testCase),
      response: completion.response,
      decision,
      modelId: completion.modelId,
      durationMs: Date.now() - start,
      error: completion.error ?? (decision ? undefined : PARSE_ERROR),
      score: null,
      notes: null,
    };
  } catch (error) {
    return {
      ...fields(testCase),
      response: "",
      decision: null,
      modelId: "",
      durationMs: Date.now() - start,
      error: error instanceof Error ? error.message : String(error),
      score: null,
      notes: null,
    };
  }
}

export async function runSuite(cases: TestCase[], agent: Agent): Promise<EvalResult[]> {
  const results: EvalResult[] = [];
  for (const testCase of cases) {
    results.push(await runCase(testCase, agent));
  }
  return results;
}

function fields(testCase: TestCase) {
  return {
    testCaseId: testCase.id,
    input: testCase.input,
    expectedCharacteristics: testCase.expectedCharacteristics,
    difficulty: testCase.difficulty,
    category: testCase.category,
  };
}
