export const COMPONENTS = ["Button", "Link"] as const;
export type ComponentName = (typeof COMPONENTS)[number];

export const DIFFICULTIES = ["simple", "medium", "hard", "edge"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const CATEGORIES = ["action-or-navigation", "visible-text", "accessible-name", "constraint"] as const;
export type Category = (typeof CATEGORIES)[number];

export interface LabelDecision {
  component: ComponentName;
  visibleText: string | null;
  accessibleName: string;
}

export interface TestCase {
  id: string;
  input: string;
  expectedCharacteristics: string[];
  expectedComponent?: ComponentName;
  difficulty: Difficulty;
  category: Category;
}

export interface Score {
  name: string;
  score: number;
  metadata?: Record<string, unknown>;
}

export interface EvalResult {
  testCaseId: string;
  input: string;
  expectedCharacteristics: string[];
  difficulty: Difficulty;
  category: Category;
  response: string;
  decision: LabelDecision | null;
  modelId: string;
  durationMs: number;
  error?: string;
  score: 1 | 2 | 3 | 4 | 5 | null;
  notes: string | null;
}

export interface ScoredResult extends EvalResult {
  scores: Score[];
}

export interface AgentCompletion {
  response: string;
  modelId: string;
  error?: string;
}

export interface Agent {
  complete(prompt: string): Promise<AgentCompletion>;
}
