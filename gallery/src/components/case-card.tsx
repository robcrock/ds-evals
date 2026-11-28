import type { ScoredResult } from "../api.ts";

export function CaseIdentity({ result }: { result: ScoredResult }) {
  return (
    <header className="flex min-w-0 flex-col gap-1">
      <h2 className="font-mono text-sm font-medium tracking-tight text-balance">{result.testCaseId}</h2>
      <p className="text-muted-foreground text-xs">
        <span>{result.difficulty}</span>
        <span aria-hidden="true"> · </span>
        <span>{result.category}</span>
      </p>
    </header>
  );
}
