import { Check, X } from "lucide-react";
import type { LabelDecision } from "../../../src/types.ts";
import type { ScoredResult } from "../api.ts";
import { meetsExpectation } from "../expectations.ts";
import { DecisionPreview } from "./decision-preview.tsx";

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

export function CasePrompt({ result }: { result: ScoredResult }) {
  return <p className="text-muted-foreground max-w-[65ch] text-base text-pretty sm:text-sm">{result.input}</p>;
}

export function CaseOutput({ result }: { result: ScoredResult }) {
  if (result.decision) return <DecisionPreview decision={result.decision} />;
  return (
    <div className="flex flex-col gap-2">
      <p className="text-destructive text-sm font-medium">{result.error ?? "No decision"}</p>
      <pre className="bg-muted overflow-x-auto rounded-md p-3 text-xs whitespace-pre-wrap [scrollbar-color:rgba(0,0,0,0.2)_transparent] [scrollbar-width:thin]">
        {result.response || "(empty response)"}
      </pre>
    </div>
  );
}

export function CaseChecks({ result }: { result: ScoredResult }) {
  return <Expectations lines={result.expectedCharacteristics} decision={result.decision} />;
}

function Expectations({ lines, decision }: { lines: string[]; decision: LabelDecision | null }) {
  return (
    <ul className="flex flex-col gap-2" role="list" aria-label="Expectations">
      {lines.map((line) => {
        const met = meetsExpectation(line, decision);
        return (
          <li key={line} className="flex items-start gap-2">
            <span className="flex size-4 shrink-0 items-center justify-center" aria-hidden="true">
              {met === true ? <Check className="size-3.5" /> : null}
              {met === false ? <X className="size-3.5 text-destructive" /> : null}
            </span>
            {met === null ? null : <span className="sr-only">{met ? "Met" : "Missed"}</span>}
            <span className={met === true ? "text-muted-foreground text-sm text-pretty" : "text-sm text-pretty"}>{line}</span>
          </li>
        );
      })}
    </ul>
  );
}
