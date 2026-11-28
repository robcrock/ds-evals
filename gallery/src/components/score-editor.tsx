import { useId, useRef, useState, useEffect, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { saveHumanScore, type ScoredResult } from "../api.ts";

type HumanScore = ScoredResult["score"];
type Decision = Exclude<HumanScore, null>;

const ORDER = ["fail", "pass"] as const;

const DETAIL: Record<Decision, string> = {
  fail: "A characteristic misses: the wrong component, a forbidden or vague label, no decision, or a parse error.",
  pass: "Every characteristic holds. The component, the visible text, and the accessible name agree.",
};

const UNDECIDED = "Pass when every characteristic holds. Two different wordings can both pass. If you are unsure, it fails.";

function move(current: HumanScore, key: string): Decision {
  if (key === "Home") return "fail";
  if (key === "End") return "pass";
  const index = current === "fail" ? 0 : current === "pass" ? 1 : -1;
  const forward = key === "ArrowRight" || key === "ArrowDown";
  if (index === -1) return forward ? "fail" : "pass";
  const next = forward ? index + 1 : index - 1;
  return ORDER[(next + ORDER.length) % ORDER.length] ?? "fail";
}

export function ScoreEditor({
  file,
  result,
  readOnly,
  onSaved,
  className = "flex flex-col gap-8",
}: {
  file: string;
  result: ScoredResult;
  readOnly: boolean;
  onSaved: (result: ScoredResult) => void;
  className?: string;
}) {
  const [notes, setNotes] = useState(result.notes ?? "");
  const [score, setScore] = useState<HumanScore>(result.score);
  const [status, setStatus] = useState<string | null>(null);
  const notesId = useId();
  const detailId = useId();
  const saveSeq = useRef(0);
  const choiceRef = useRef<Partial<Record<Decision, HTMLButtonElement | null>>>({});

  useEffect(() => {
    setScore(result.score);
    setNotes(result.notes ?? "");
  }, [result.testCaseId, result.score, result.notes]);

  async function save(next: HumanScore, nextNotes: string) {
    const seq = ++saveSeq.current;
    setScore(next);
    setStatus(null);
    try {
      const saved = await saveHumanScore(file, result.testCaseId, { score: next, notes: nextNotes });
      if (seq !== saveSeq.current) return;
      onSaved({ ...result, ...saved });
    } catch (error) {
      if (seq !== saveSeq.current) return;
      setScore(result.score);
      setStatus(error instanceof Error ? error.message : String(error));
    }
  }

  function choose(next: Decision) {
    if (readOnly || next === score) return;
    void save(next, notes);
  }

  function onKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (readOnly) return;
    const key = event.key;
    if (!["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown", "Home", "End"].includes(key)) return;
    event.preventDefault();
    const next = move(score, key);
    choose(next);
    choiceRef.current[next]?.focus();
  }

  const detail = score ? DETAIL[score] : UNDECIDED;

  return (
    <div className={className}>
      <div className={`flex flex-col gap-3 ${readOnly ? "opacity-50" : ""}`}>
        <div className="flex flex-wrap items-center gap-2">
          <div
            role="radiogroup"
            aria-label={`Wording for ${result.testCaseId}`}
            aria-describedby={detailId}
            className="grid min-w-0 flex-1 grid-cols-2 gap-2 sm:max-w-xs sm:flex-none"
            onKeyDown={onKeyDown}
          >
            {ORDER.map((value) => {
              const selected = score === value;
              const label = value === "pass" ? "Pass" : "Fail";
              return (
                <button
                  key={value}
                  ref={(node) => {
                    choiceRef.current[value] = node;
                  }}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  tabIndex={selected || (score === null && value === "fail") ? 0 : -1}
                  disabled={readOnly}
                  onClick={() => choose(value)}
                  className={`inline-flex min-h-11 items-center justify-center rounded-md border px-3 text-sm font-medium transition-[color,background-color,transform] duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-[0.97] disabled:pointer-events-none ${selected ? "border-foreground bg-foreground text-background" : "bg-background hover:bg-accent"}`}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            className="inline-flex min-h-11 items-center rounded-md px-3 text-sm transition-[background-color,transform] duration-150 ease-out hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40"
            disabled={readOnly || score === null}
            onClick={() => save(null, notes)}
          >
            Clear
          </button>
        </div>
        <p id={detailId} className="text-muted-foreground max-w-[65ch] min-h-10 text-xs text-pretty">
          {detail}
        </p>
        <p className="text-destructive min-h-4 text-xs" aria-live="polite">
          {status}
        </p>
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (readOnly || notes === (result.notes ?? "")) return;
          save(score, notes);
        }}
      >
        <label htmlFor={notesId} className="flex flex-col gap-2">
          <span className="text-sm font-medium">Add a note</span>
          <textarea
            id={notesId}
            name="notes"
            className="bg-background min-h-32 min-w-0 rounded-md border px-3 py-2 text-base shadow-xs transition-[color,background-color,box-shadow] duration-150 ease-out pointer-fine:text-sm disabled:opacity-50"
            value={notes}
            disabled={readOnly}
            onChange={(event) => setNotes(event.target.value)}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            onBlur={() => !readOnly && notes !== (result.notes ?? "") && save(score, notes)}
          />
        </label>
      </form>
    </div>
  );
}
