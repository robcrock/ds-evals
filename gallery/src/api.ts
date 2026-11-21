import type { RunSource, RunSummary } from "../server/runs.ts";
import type { ScoredResult } from "../../src/types.ts";

export type { RunSummary, ScoredResult };

export async function fetchRuns(): Promise<RunSummary[]> {
  return request("/api/runs");
}

export async function fetchRun(file: string): Promise<{ source: RunSource; results: ScoredResult[] }> {
  return request(`/api/runs/${encodeURIComponent(file)}`);
}

export async function saveHumanScore(
  file: string,
  caseId: string,
  update: Pick<ScoredResult, "score" | "notes">,
): Promise<ScoredResult> {
  return request(`/api/runs/${encodeURIComponent(file)}/${encodeURIComponent(caseId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(update),
  });
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? `${res.status} ${res.statusText}`);
  return body as T;
}
