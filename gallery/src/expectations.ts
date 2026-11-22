import type { LabelDecision, Score } from "../../src/types.ts";

const STOP = new Set([
  "a",
  "an",
  "the",
  "that",
  "it",
  "will",
  "be",
  "or",
  "as",
  "to",
  "of",
  "and",
  "this",
  "on",
  "for",
  "such",
  "close",
  "wording",
  "action",
  "open",
  "opens",
  "say",
  "says",
  "state",
  "states",
  "name",
  "names",
  "more",
  "now",
  "here",
  "with",
  "from",
  "into",
]);

// Reads one characteristic against the decision. Null means the line has no rule yet,
// so the card does not invent a pass or a miss.
export function meetsExpectation(text: string, decision: LabelDecision | null): boolean | null {
  if (!decision) return false;
  const line = text.trim();

  const component = /^component is (Button|Link)$/i.exec(line);
  if (component?.[1]) return decision.component.toLowerCase() === component[1].toLowerCase();

  if (/^visibleText is null$/i.test(line)) return decision.visibleText === null;

  if (/^accessible name matches the visible text$/i.test(line)) {
    return decision.visibleText !== null && same(decision.visibleText, decision.accessibleName);
  }

  if (/^accessible name is present$/i.test(line)) return decision.accessibleName.trim().length > 0;

  const presentAndNot = /^accessible name is present and is not (.+)$/i.exec(line);
  if (presentAndNot?.[1]) {
    return decision.accessibleName.trim().length > 0 && !mentionsAny(decision.accessibleName, splitList(presentAndNot[1]));
  }

  const absent = /^(visible text|accessible name) is not (.+)$/i.exec(line);
  if (absent?.[1] && absent[2]) {
    const field = absent[1].toLowerCase().startsWith("visible") ? decision.visibleText : decision.accessibleName;
    return !mentionsAny(field, splitList(absent[2]));
  }

  const namesAndNot = /^visible text names the (.+) and is not (.+)$/i.exec(line);
  if (namesAndNot?.[1] && namesAndNot[2]) {
    return mentions(decision.visibleText, namesAndNot[1]) && !mentionsAny(decision.visibleText, splitList(namesAndNot[2]));
  }

  const names = /^visible text names the (.+?)(?:, such as (.+))?$/i.exec(line);
  if (names?.[1]) return matchesHint(decision.visibleText, names[1], names[2]);

  const close = /^visible text is (.+?) or a close wording(?: such as (.+))?$/i.exec(line);
  if (close?.[1]) return matchesHint(decision.visibleText, close[1], close[2]);

  const states = /^accessible name (?:states that|says) (.+)$/i.exec(line);
  if (states?.[1]) return mentions(decision.accessibleName, states[1]);

  const avoid = /^the decision does not describe (.+)$/i.exec(line);
  if (avoid?.[1]) {
    const topic = avoid[1].replace(/ as the label$/i, "");
    return !mentions(decision.visibleText, topic) && !mentions(decision.accessibleName, topic);
  }

  const invent = /do not invent .+ such as (.+)$/i.exec(line);
  if (invent?.[1]) {
    const banned = splitList(invent[1]);
    return !mentionsAny(decision.visibleText, banned) && !mentionsAny(decision.accessibleName, banned);
  }

  return null;
}

export function checksNote(scores: Pick<Score, "name" | "score">[]): string | null {
  if (scores.length === 0) return null;
  const missed = scores.filter((score) => score.score !== 1);
  if (missed.length === 0) return `${scores.length} checks passed`;
  return `${missed.map((score) => score.name).join(", ")} missed`;
}

function matchesHint(value: string | null, topic: string, examples: string | undefined): boolean {
  if (examples && splitList(examples).some((example) => mentionsPhrase(value, example))) return true;
  return mentions(value, topic);
}

function mentions(value: string | null, phrase: string): boolean {
  const field = norm(value);
  if (!field) return false;
  const words = phrase
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map(stem)
    .filter((word) => word.length > 2 && !STOP.has(word));
  return words.some((word) => field.includes(word));
}

function mentionsAny(value: string | null, phrases: string[]): boolean {
  return phrases.some((phrase) => mentionsPhrase(value, phrase));
}

function mentionsPhrase(value: string | null, phrase: string): boolean {
  const field = norm(value);
  const needle = norm(phrase);
  if (!field || !needle) return false;
  if (needle.includes(" ")) return field.includes(needle);
  return new RegExp(`\\b${escapeRegExp(needle)}\\b`, "i").test(field);
}

function splitList(value: string): string[] {
  return value
    .replace(/\s+or\s+/gi, ",")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function same(left: string, right: string): boolean {
  return norm(left) === norm(right);
}

function norm(value: string | null): string {
  return (value ?? "").trim().toLowerCase().replace(/[.!?]+$/g, "").trim();
}

function stem(word: string): string {
  if (word.endsWith("tion") && word.length > 5) return word.slice(0, -4);
  if (word.endsWith("ing") && word.length > 5) return word.slice(0, -3);
  if (word.endsWith("ed") && word.length > 4) return word.slice(0, -2);
  if (word.endsWith("s") && word.length > 4) return word.slice(0, -1);
  return word;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
