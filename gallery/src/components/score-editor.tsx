import { animate, motion, useMotionValue, useReducedMotion } from "motion/react";
import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { saveHumanScore, type ScoredResult } from "../api.ts";

const KNOB = 22;
const EASE = [0.22, 1, 0.36, 1] as const;

type HumanScore = ScoredResult["score"];
type Slot = 0 | 1 | 2 | 3 | 4 | 5;

const RUBRIC = [
  { score: 1, name: "Failed", detail: "No decision, a parse error, or a label for a different control." },
  { score: 2, name: "Poor", detail: "The wrong component, or a forbidden label, with some of the requested intent still visible." },
  { score: 3, name: "Acceptable", detail: "The component is right. The visible text or the accessible name is vague or slightly off." },
  { score: 4, name: "Good", detail: "The component is right and the name is still clear. One small wording issue." },
  { score: 5, name: "Excellent", detail: "Every characteristic holds. The component, the visible text, and the accessible name agree." },
] as const;

function stepFor(score: HumanScore) {
  return RUBRIC.find((item) => item.score === score) ?? null;
}

function placeFor(score: HumanScore): { slot: Slot; along: number | null } {
  if (score == null) return { slot: 0, along: null };
  return { slot: score, along: (score - 1) / 4 };
}

export function WordingPocket({
  label,
  score,
  disabled = false,
  status = null,
  onScore,
}: {
  label: string;
  score: HumanScore;
  disabled?: boolean;
  status?: string | null;
  onScore: (score: HumanScore) => void;
}) {
  const [place, setPlace] = useState(() => placeFor(score));
  const placeRef = useRef(place);
  const slotRef = useRef(place.slot);
  const dragRef = useRef(false);
  const readyRef = useRef(false);
  const rowRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(11);
  const scale = useMotionValue(0.55);
  const reduced = useReducedMotion();
  const reducedRef = useRef(reduced === true);
  reducedRef.current = reduced === true;
  const shown: HumanScore = place.slot === 0 ? null : place.slot;
  const step = stepFor(shown);
  const parked = place.along === null;

  function placeFromPointer(clientX: number): { slot: Slot; along: number | null } {
    const track = trackRef.current;
    if (!track) return placeRef.current;
    const rect = track.getBoundingClientRect();
    if (clientX < rect.left) return { slot: 0, along: null };
    const inner = Math.max(1, rect.width - KNOB);
    const raw = Math.min(1, Math.max(0, (clientX - rect.left - KNOB / 2) / inner));
    const slot = (Math.round(raw * 4) + 1) as Slot;
    return { slot, along: (slot - 1) / 4 };
  }

  function paint(along: number | null, immediate = false) {
    const row = rowRef.current;
    const track = trackRef.current;
    if (!row || !track) return;
    const rowRect = row.getBoundingClientRect();
    const trackRect = track.getBoundingClientRect();
    const origin = trackRect.left - rowRect.left;
    const nextX = along === null ? 11 : origin + (trackRect.width - KNOB) * along;
    const nextScale = along === null ? 0.55 : 1;
    if (along === null) row.setAttribute("data-parked", "");
    else row.removeAttribute("data-parked");
    if (immediate || !readyRef.current || reducedRef.current) {
      x.set(nextX);
      scale.set(nextScale);
      return;
    }
    const transition = { duration: 0.16, ease: EASE };
    animate(x, nextX, transition);
    animate(scale, nextScale, transition);
  }

  function commit(next: Slot) {
    const value: HumanScore = next === 0 ? null : next;
    if (value !== score) onScore(value);
  }

  function goTo(next: { slot: Slot; along: number | null }) {
    if (next.slot === slotRef.current) return;
    placeRef.current = next;
    slotRef.current = next.slot;
    setPlace(next);
    paint(next.along);
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (disabled) return;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // A pointer the browser will not capture can still set the score.
    }
    dragRef.current = true;
    goTo(placeFromPointer(event.clientX));
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (disabled || !dragRef.current || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
    goTo(placeFromPointer(event.clientX));
  }

  function onPointerUp() {
    if (!dragRef.current) return;
    dragRef.current = false;
    commit(slotRef.current);
  }

  function onKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (disabled) return;
    const key = event.key;
    if (!["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown", "Home", "End"].includes(key)) return;
    event.preventDefault();
    event.stopPropagation();
    if (key === "Home") commit(0);
    else if (key === "End") commit(5);
    else if (key === "ArrowRight" || key === "ArrowUp") commit(Math.min(5, place.slot + 1) as Slot);
    else commit(Math.max(0, place.slot - 1) as Slot);
  }

  useLayoutEffect(() => {
    if (!dragRef.current) paint(place.along);
    readyRef.current = true;
  }, [place]);

  useLayoutEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const observer = new ResizeObserver(() => {
      if (!dragRef.current) paint(placeRef.current.along, true);
    });
    observer.observe(row);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    return () => {
      x.stop();
      scale.stop();
    };
  }, [x, scale]);

  useEffect(() => {
    if (dragRef.current) return;
    const next = placeFor(score);
    placeRef.current = next;
    slotRef.current = next.slot;
    setPlace((current) => (current.slot === next.slot && current.along === next.along ? current : next));
  }, [score]);

  return (
    <div className="flex flex-col">
      <div className="text-muted-foreground pointer-events-none mb-[-12px] flex gap-3 text-xs font-medium">
        <span className="w-11 shrink-0" aria-hidden="true" />
        <span className="flex flex-1 justify-between px-[11px]">
          <span>Failed</span>
          <span>Excellent</span>
        </span>
      </div>
      <div
        ref={rowRef}
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled || undefined}
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={5}
        aria-valuenow={place.slot}
        aria-valuetext={step ? `${step.score}, ${step.name}. ${step.detail}` : "Not scored"}
        data-parked={parked ? "" : undefined}
        className="score-row relative flex h-11 touch-pan-y cursor-pointer items-center gap-3 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-disabled:cursor-default aria-disabled:opacity-50"
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <span
          aria-hidden="true"
          className="bg-muted pointer-events-none size-11 shrink-0 rounded-full shadow-[inset_0_1px_3px_rgb(0_0_0/0.22),inset_0_0_0_1px_rgb(0_0_0/0.06)]"
        />
        <div ref={trackRef} className="relative h-11 min-w-0 flex-1">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-[11px] top-1/2 h-1 -translate-y-1/2 rounded-full bg-[color-mix(in_oklch,var(--foreground)_22%,transparent)]"
          />
          {RUBRIC.map((item) => (
            <span
              key={item.score}
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground"
              style={{ left: `calc(${KNOB / 2}px + (100% - ${KNOB}px) * ${(item.score - 1) / 4})` }}
            />
          ))}
        </div>
        <motion.span
          aria-hidden="true"
          style={{ x, y: "-50%", scale }}
          className="score-knob pointer-events-none absolute top-1/2 left-0 flex size-[22px] items-center justify-center rounded-full border-2 border-background bg-foreground text-[11px] leading-none font-medium text-background tabular-nums shadow-[0_0_0_1px_var(--foreground)]"
        >
          {place.slot === 0 ? null : place.slot}
        </motion.span>
      </div>
      <div className="flex gap-3">
        <span className="w-11 shrink-0" aria-hidden="true" />
        <div className="flex min-w-0 flex-1 flex-col gap-1 ps-[11px]">
          <div className="flex min-h-5 items-baseline justify-between gap-3">
            <p className="text-sm font-medium tabular-nums">{step ? `${step.name} · ${step.score}` : "Not scored"}</p>
            <span className="text-muted-foreground text-end text-xs" aria-live="polite">
              {status}
            </span>
          </div>
          <p className="text-muted-foreground min-h-10 text-xs text-pretty">
            {step ? step.detail : "The handle is parked. Drag it onto the scale."}
          </p>
        </div>
      </div>
    </div>
  );
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
  const saveSeq = useRef(0);

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

  return (
    <div className={className}>
      <WordingPocket
        label={`Score for ${result.testCaseId}`}
        score={score}
        disabled={readOnly}
        status={status}
        onScore={(next) => save(next, notes)}
      />
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
