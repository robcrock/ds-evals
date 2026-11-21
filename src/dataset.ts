import { CATEGORIES, COMPONENTS, DIFFICULTIES, type ComponentName, type TestCase } from "./types.ts";

export function parseCases(value: unknown): TestCase[] {
  if (!Array.isArray(value)) {
    throw new Error("Dataset must be an array.");
  }

  const ids = new Set<string>();
  return value.map((item) => parseCase(item, ids));
}

function parseCase(value: unknown, ids: Set<string>): TestCase {
  if (typeof value !== "object" || value === null) {
    throw new Error("Each case must be an object.");
  }
  const record = value as Record<string, unknown>;
  const id = requiredString(record.id, "id");
  if (ids.has(id)) throw new Error(`duplicate id ${id}`);
  ids.add(id);

  const expectedCharacteristics = stringList(record.expectedCharacteristics, id);
  if (expectedCharacteristics.length === 0) {
    throw new Error(`${id} needs at least one characteristic`);
  }

  return {
    id,
    input: requiredString(record.input, `${id} input`),
    expectedCharacteristics,
    expectedComponent: optionalComponent(record.expectedComponent, id),
    difficulty: oneOf(record.difficulty, DIFFICULTIES, `${id} difficulty`),
    category: oneOf(record.category, CATEGORIES, `${id} category`),
  };
}

function requiredString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}

function stringList(value: unknown, id: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || item.trim().length === 0)) {
    throw new Error(`${id} characteristics must be a list of strings`);
  }
  return value;
}

function optionalComponent(value: unknown, id: string): ComponentName | undefined {
  if (value === undefined) return undefined;
  if (typeof value === "string" && COMPONENTS.some((component) => component === value)) {
    return value as ComponentName;
  }
  throw new Error(`${id} expectedComponent must be Button or Link`);
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], label: string): T {
  if (typeof value === "string" && allowed.some((item) => item === value)) {
    return value as T;
  }
  throw new Error(`${label} must be one of ${allowed.join(", ")}`);
}
