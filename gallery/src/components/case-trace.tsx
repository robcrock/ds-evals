import { Bot, Braces, Eye, ListChecks, MessageSquare, Scale } from "lucide-react";
import { systemPrompt } from "../../../src/task.ts";
import type { ScoredResult } from "../api.ts";
import {
  SPAN_IDS,
  characteristicMet,
  checkDetail,
  formatDuration,
  openingSpan,
  shortModel,
  spanStatus,
  spanTitle,
  spanWhen,
  type SpanId,
} from "../case-log.ts";
import { DecisionPreview } from "./decision-preview.tsx";
import { Trace, TraceCollapsible, TraceCollapsibleContent, TraceCollapsibleTrigger, TraceDescription, TraceIcon, TraceLine, TraceTitle } from "./ui/trace.tsx";

const pre =
  "bg-muted text-foreground max-h-64 overflow-auto rounded-md p-3 font-mono text-xs break-words whitespace-pre-wrap [scrollbar-color:rgba(0,0,0,0.2)_transparent] [scrollbar-width:thin]";

export function CaseTrace({ result }: { result: ScoredResult }) {
  const open = openingSpan(result);
  return (
    <Trace>
      {SPAN_IDS.map((id) => (
        <TraceCollapsible key={id} defaultOpen={id === open}>
          <TraceCollapsibleTrigger>
            <TraceLine status={spanStatus(result, id)}>
              <TraceIcon>
                <SpanIcon id={id} />
              </TraceIcon>
              <TraceTitle>{spanTitle(result, id)}</TraceTitle>
              <TraceDescription>{spanWhen(result, id)}</TraceDescription>
            </TraceLine>
          </TraceCollapsibleTrigger>
          <TraceCollapsibleContent>
            <SpanBody result={result} id={id} />
          </TraceCollapsibleContent>
        </TraceCollapsible>
      ))}
    </Trace>
  );
}

function SpanIcon({ id }: { id: SpanId }) {
  if (id === "prompt") return <MessageSquare />;
  if (id === "model") return <Bot />;
  if (id === "parse") return <Braces />;
  if (id === "render") return <Eye />;
  if (id === "checks") return <ListChecks />;
  return <Scale />;
}

function SpanBody({ result, id }: { result: ScoredResult; id: SpanId }) {
  if (id === "prompt") {
    return <p className="max-w-[65ch] text-base text-pretty sm:text-sm">{result.input}</p>;
  }

  if (id === "model") {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm">
          <span className="tabular-nums">{shortModel(result.modelId)}</span>
          <span> · {result.modelId} · tools off · thinking low · </span>
          <span className="tabular-nums">{formatDuration(result.durationMs)}</span>
        </p>
        <LogBlock label="System" text={systemPrompt()} />
        <LogBlock label="User" text={result.input} />
        <LogBlock label="Assistant" text={result.response || "(empty response)"} />
      </div>
    );
  }

  if (id === "parse") {
    if (!result.decision) {
      return (
        <div className="flex flex-col gap-3">
          <p className="text-destructive text-sm font-medium">{result.error ?? "No decision"}</p>
          <pre className={pre}>{result.response || "(empty response)"}</pre>
        </div>
      );
    }
    const decision = result.decision;
    return (
      <dl className="grid max-w-[65ch] grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">
        <dt>Component</dt>
        <dd className="text-foreground break-words">{decision.component}</dd>
        <dt>Visible text</dt>
        <dd className="text-foreground break-words">{decision.visibleText ?? "null"}</dd>
        <dt>Accessible name</dt>
        <dd className="text-foreground break-words">{decision.accessibleName}</dd>
      </dl>
    );
  }

  if (id === "render") {
    if (!result.decision) {
      return <p className="max-w-[65ch] text-sm text-pretty">No decision, so the gallery has no control to draw.</p>;
    }
    return (
      <div className="text-foreground min-w-0 overflow-x-auto">
        <DecisionPreview decision={result.decision} />
      </div>
    );
  }

  if (id === "checks") {
    return (
      <div className="flex max-w-[65ch] flex-col gap-4">
        <ul className="flex flex-col gap-2" aria-label="Automatic checks">
          {result.scores.map((score) => (
            <li key={score.name} className="text-sm text-pretty">
              <span className="text-foreground font-medium">{score.name}</span>
              <span className={score.score === 1 ? "" : "text-destructive"}>{score.score === 1 ? " passed" : " missed"}</span>
              <span> · {checkDetail(score)}</span>
            </li>
          ))}
        </ul>
        <ul className="flex flex-col gap-2" aria-label="Characteristics">
          {result.expectedCharacteristics.map((line) => {
            const met = characteristicMet(result, line);
            return (
              <li key={line} className="text-sm text-pretty">
                {met === null ? null : <span className={met ? "" : "text-destructive"}>{met ? "Met" : "Missed"} · </span>}
                <span className="text-foreground">{line}</span>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  const judgment = result.score === "pass" ? "Pass" : result.score === "fail" ? "Fail" : "Not scored";
  return (
    <div className="flex max-w-[65ch] flex-col gap-2">
      <p className={`text-sm font-medium ${result.score === "fail" ? "text-destructive" : "text-foreground"}`}>{judgment}</p>
      <p className="text-foreground text-sm text-pretty">{result.notes ?? "No note."}</p>
    </div>
  );
}

function LogBlock({ label, text }: { label: string; text: string }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs">{label}</p>
      <pre className={pre}>{text}</pre>
    </div>
  );
}
