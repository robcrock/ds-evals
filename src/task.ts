import { CONTRACT } from "./contract.ts";
import { COMPONENTS, type ComponentName, type LabelDecision } from "./types.ts";

export const OUTPUT_RULE = `Reply with one JSON object and nothing else.
{"component":"Button" | "Link","visibleText":string | null,"accessibleName":string}
visibleText is null only when the control has no visible text.
accessibleName is required and must not be empty.`;

const FENCE = /```(?:json)?\s*([\s\S]*?)```/i;

export function systemPrompt(): string {
  return `${CONTRACT}\n\n${OUTPUT_RULE}`;
}

export function parseDecision(response: string): LabelDecision | null {
  const fenced = FENCE.exec(response);
  const source = (fenced?.[1] ?? response).trim();
  const start = source.indexOf("{");
  const end = source.lastIndexOf("}");
  if (start === -1 || end <= start) return null;

  let value: unknown;
  try {
    value = JSON.parse(source.slice(start, end + 1));
  } catch {
    return null;
  }
  if (!isDecision(value)) return null;
  return {
    component: value.component,
    visibleText: value.visibleText === null ? null : value.visibleText.trim(),
    accessibleName: value.accessibleName.trim(),
  };
}

function isDecision(value: unknown): value is LabelDecision {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    isComponent(record.component) &&
    isVisibleText(record.visibleText) &&
    isAccessibleName(record.accessibleName)
  );
}

function isComponent(value: unknown): value is ComponentName {
  return typeof value === "string" && COMPONENTS.some((component) => component === value);
}

function isVisibleText(value: unknown): value is string | null {
  return value === null || (typeof value === "string" && value.trim().length > 0);
}

function isAccessibleName(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
