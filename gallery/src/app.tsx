import { useEffect, useId, useMemo, useState } from "react";
import { fetchRun, fetchRuns, type RunSummary, type ScoredResult } from "./api.ts";
import { CaseStudy } from "./components/case-groups.tsx";
import { CATEGORIES, DIFFICULTIES } from "../../src/types.ts";

const columnY = "pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]";

export function App() {
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [file, setFile] = useState<string | null>(null);
  const [results, setResults] = useState<ScoredResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [failuresOnly, setFailuresOnly] = useState(false);
  const [difficulty, setDifficulty] = useState<string[]>([]);
  const [category, setCategory] = useState<string[]>([]);
  const [caseId, setCaseId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [pending, setPending] = useState(true);
  const [showPending, setShowPending] = useState(false);

  useEffect(() => {
    if (!pending) {
      setShowPending(false);
      return;
    }
    const timer = window.setTimeout(() => setShowPending(true), 150);
    return () => window.clearTimeout(timer);
  }, [pending]);

  useEffect(() => {
    let cancelled = false;
    setPending(true);
    fetchRuns()
      .then((list) => {
        if (cancelled) return;
        setRuns(list);
        setError(null);
        const requested = new URLSearchParams(window.location.search).get("run");
        const next = list.find((item) => item.file === requested)?.file ?? list[0]?.file ?? null;
        setFile(next);
        if (!next) setPending(false);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message);
        setPending(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  useEffect(() => {
    if (!file) return;
    let cancelled = false;
    setPending(true);
    fetchRun(file)
      .then((run) => {
        if (cancelled) return;
        setResults(run.results);
        setError(null);
        setPending(false);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message);
        setPending(false);
      });
    return () => {
      cancelled = true;
    };
  }, [file, reloadKey]);

  const run = runs.find((item) => item.file === file);
  const readOnly = run?.source === "fixture";

  const visible = useMemo(
    () =>
      results.filter(
        (result) =>
          (!failuresOnly || isFailure(result)) &&
          (difficulty.length === 0 || difficulty.includes(result.difficulty)) &&
          (category.length === 0 || category.includes(result.category)),
      ),
    [results, failuresOnly, difficulty, category],
  );

  const index = Math.max(0, visible.findIndex((item) => item.testCaseId === caseId));
  const current = visible[index];

  function clearFilters() {
    setFailuresOnly(false);
    setDifficulty([]);
    setCategory([]);
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable) return;
      if (target.closest("[role=radiogroup]")) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === "[") {
        const next = visible[index - 1];
        if (next) setCaseId(next.testCaseId);
      }
      if (event.key === "]") {
        const next = visible[index + 1];
        if (next) setCaseId(next.testCaseId);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [visible, index]);

  function replace(updated: ScoredResult) {
    setResults((items) => items.map((item) => (item.testCaseId === updated.testCaseId ? updated : item)));
  }

  const shared = {
    runs,
    file,
    setFile,
    results,
    error,
    readOnly,
    failuresOnly,
    setFailuresOnly,
    difficulty,
    setDifficulty,
    category,
    setCategory,
    visible,
    current,
    setCaseId,
    replace,
    clearFilters,
    pending,
    showPending,
    retry: () => setReloadKey((key) => key + 1),
  };

  return <Columns {...shared} />;
}

type Gallery = {
  runs: RunSummary[];
  file: string | null;
  setFile: (file: string) => void;
  results: ScoredResult[];
  error: string | null;
  readOnly: boolean;
  failuresOnly: boolean;
  setFailuresOnly: (value: boolean) => void;
  difficulty: string[];
  setDifficulty: (value: string[]) => void;
  category: string[];
  setCategory: (value: string[]) => void;
  visible: ScoredResult[];
  current: ScoredResult | undefined;
  setCaseId: (id: string) => void;
  replace: (result: ScoredResult) => void;
  clearFilters: () => void;
  pending: boolean;
  showPending: boolean;
  retry: () => void;
};

function Columns(props: Gallery) {
  const { runs, file, setFile, results, visible, current, failuresOnly, setFailuresOnly, difficulty, setDifficulty, category, setCategory, setCaseId } = props;
  const at = visible.findIndex((item) => item.testCaseId === current?.testCaseId);
  const previous = at > 0 ? visible[at - 1] : undefined;
  const next = at >= 0 && at < visible.length - 1 ? visible[at + 1] : undefined;
  return (
    <div className="relative min-[64rem]:grid min-[64rem]:h-dvh min-[64rem]:grid-cols-[16rem_minmax(0,1fr)_18rem] min-[64rem]:overflow-hidden">
      <a className="skip-link" href="#main">
        Skip to case
      </a>
      <div className={`column-scroll hairline-after min-[64rem]:min-h-0 min-[64rem]:overflow-auto min-[64rem]:overscroll-y-contain ${columnY} ps-[max(1rem,env(safe-area-inset-left))] pe-4`}>
        <CaseNav
          failuresOnly={failuresOnly}
          onFailures={setFailuresOnly}
          difficulty={difficulty}
          onDifficulty={setDifficulty}
          category={category}
          onCategory={setCategory}
          visible={visible}
          total={results.length}
          currentId={current?.testCaseId}
          onCase={setCaseId}
        />
      </div>
      <main className="column-scroll min-w-0 min-[64rem]:min-h-0 min-[64rem]:overflow-auto min-[64rem]:overscroll-y-contain">
        <div className={`mx-auto w-[min(100%,42rem)] ps-[max(2rem,env(safe-area-inset-left))] pe-[max(2rem,env(safe-area-inset-right))] min-[64rem]:ps-8 min-[64rem]:pe-8 ${columnY}`}>
          <CaseStudy
            error={props.error}
            readOnly={props.readOnly}
            results={results}
            visible={visible}
            file={file}
            current={current}
            replace={props.replace}
            clearFilters={props.clearFilters}
            pending={props.pending}
            showPending={props.showPending}
            retry={props.retry}
            previous={previous}
            next={next}
            onCase={setCaseId}
          />
        </div>
      </main>
      <div className={`column-scroll hairline-before min-[64rem]:min-h-0 min-[64rem]:overflow-auto min-[64rem]:overscroll-y-contain ${columnY} ps-4 pe-[max(1rem,env(safe-area-inset-right))]`}>
        <RunHistory runs={runs} file={file} onFile={setFile} results={results} />
      </div>
    </div>
  );
}

function CaseNav({
  failuresOnly,
  onFailures,
  difficulty,
  onDifficulty,
  category,
  onCategory,
  visible,
  total,
  currentId,
  onCase,
}: {
  failuresOnly: boolean;
  onFailures: (value: boolean) => void;
  difficulty: string[];
  onDifficulty: (value: string[]) => void;
  category: string[];
  onCategory: (value: string[]) => void;
  visible: ScoredResult[];
  total: number;
  currentId: string | undefined;
  onCase: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const chips = [
    ...(failuresOnly ? [{ kind: "failures" as const, value: "Failures only" }] : []),
    ...difficulty.map((value) => ({ kind: "difficulty" as const, value })),
    ...category.map((value) => ({ kind: "category" as const, value })),
  ];

  function remove(kind: "failures" | "difficulty" | "category", value: string) {
    if (kind === "failures") onFailures(false);
    else if (kind === "difficulty") onDifficulty(difficulty.filter((item) => item !== value));
    else onCategory(category.filter((item) => item !== value));
  }

  return (
    <nav aria-label="Cases" className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((current) => !current)}
          className="flex min-h-11 w-full items-center justify-between gap-3 rounded-md border px-3 text-left text-sm transition-[background-color,transform] duration-150 ease-out hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-[0.97]"
        >
          Filters
          <span aria-hidden="true" className="text-muted-foreground text-xs">
            {open ? "Hide" : "Show"}
          </span>
        </button>
        {open ? (
          <div id={panelId} className="border-border flex flex-col gap-4 rounded-md border px-3 py-2">
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input type="checkbox" className="size-4 shrink-0" checked={failuresOnly} onChange={(event) => onFailures(event.target.checked)} />
              Failures only
            </label>
            <Checks legend="Difficulty" options={DIFFICULTIES} selected={difficulty} onToggle={(value) => onDifficulty(toggleValue(difficulty, value))} />
            <Checks legend="Category" options={CATEGORIES} selected={category} onToggle={(value) => onCategory(toggleValue(category, value))} />
          </div>
        ) : chips.length === 0 ? (
          <p className="text-muted-foreground px-3 text-sm">All cases</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {chips.map((chip) => (
              <button
                key={`${chip.kind}-${chip.value}`}
                type="button"
                aria-label={`Remove ${chip.value}`}
                onClick={() => remove(chip.kind, chip.value)}
                className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-full border px-3 text-left text-sm transition-[background-color,transform] duration-150 ease-out hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-[0.97]"
              >
                <span className="min-w-0">{chip.value}</span>
                <span aria-hidden="true">×</span>
              </button>
            ))}
          </div>
        )}
        <p className="text-muted-foreground min-h-4 text-xs tabular-nums" aria-live="polite">
          {visible.length !== total ? `Showing ${visible.length} of ${total}` : ""}
        </p>
      </div>
      <div className="flex flex-col gap-1">
        <h2 className="text-muted-foreground text-xs">Cases</h2>
        <ul className="flex flex-col">
          {visible.map((result) => {
            const selected = result.testCaseId === currentId;
            const grade = gradeLabel(result.score);
            return (
              <li key={result.testCaseId}>
                <button
                  type="button"
                  aria-current={selected ? "true" : undefined}
                  onClick={() => onCase(result.testCaseId)}
                  className={`flex min-h-11 w-full flex-col items-start justify-center rounded-md px-2 py-1 text-left transition-[background-color,transform] duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-[0.97] ${selected ? "bg-accent" : "hover:bg-accent"}`}
                >
                  <span className="font-mono text-sm">{result.testCaseId}</span>
                  <span className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">{grade}</span>
                    {isFailure(result) ? <span className="text-destructive">Miss</span> : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}

function toggleValue(values: string[], value: string) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function Checks({ legend, options, selected, onToggle }: { legend: string; options: readonly string[]; selected: readonly string[]; onToggle: (value: string) => void }) {
  const labelId = useId();
  return (
    <div className="flex flex-col">
      <p id={labelId} className="text-muted-foreground mb-1 text-xs">
        {legend}
      </p>
      <div role="group" aria-labelledby={labelId} className="flex flex-col">
        {options.map((item) => (
          <label key={item} className="flex min-h-11 items-start gap-2 py-2 text-sm">
            <input type="checkbox" className="mt-0.5 size-4 shrink-0" checked={selected.includes(item)} onChange={() => onToggle(item)} />
            <span className="min-w-0">{item}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function RunHistory({ runs, file, onFile, results }: { runs: RunSummary[]; file: string | null; onFile: (file: string) => void; results: ScoredResult[] }) {
  const liveScored = results.filter((result) => result.score !== null).length;
  return (
    <aside aria-label="Runs" className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">Runs</h2>
        <p className="text-muted-foreground text-xs text-pretty">Newest first. The sample stays at the bottom.</p>
        <ol className="flex flex-col">
          {runs.map((item) => {
            const selected = item.file === file;
            const scored = selected ? liveScored : item.humanScored;
            const total = selected ? results.length : item.cases;
            const meta = item.source === "fixture" ? "Sample, read-only" : `${scored}/${total} scored`;
            return (
              <li key={item.file}>
                <button
                  type="button"
                  aria-current={selected ? "true" : undefined}
                  onClick={() => onFile(item.file)}
                  className={`flex min-h-11 w-full flex-col items-start justify-center rounded-md px-2 py-1 text-left transition-[background-color,transform] duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-[0.97] ${selected ? "bg-accent" : "hover:bg-accent"}`}
                >
                  <span className="text-sm">{runTitle(item)}</span>
                  <span className="text-muted-foreground text-xs tabular-nums">{meta}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
      {file && (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-medium">This run</h2>
          <pre className="bg-muted max-h-[40dvh] overflow-auto overscroll-contain rounded-md p-3 text-xs whitespace-pre-wrap [scrollbar-color:rgba(0,0,0,0.2)_transparent] [scrollbar-width:thin]">
            {JSON.stringify(runOverview(file, results), null, 2)}
          </pre>
        </div>
      )}
    </aside>
  );
}

function isFailure(result: ScoredResult): boolean {
  return Boolean(result.error) || result.scores.some((score) => score.score === 0);
}

function gradeLabel(score: ScoredResult["score"]): string {
  if (score === "pass") return "Pass";
  if (score === "fail") return "Fail";
  return "Not scored";
}

function runTitle(item: RunSummary): string {
  if (item.source === "fixture") return "Sample run";
  const match = item.file.match(/^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})/);
  if (!match) return item.file;
  return `${match[1]} ${match[2]}:${match[3]}`;
}

function runOverview(file: string, results: ScoredResult[]) {
  const names = [...new Set(results.flatMap((result) => result.scores.map((score) => score.name)))];
  const checks: Record<string, string> = {};
  for (const name of names) {
    const scores = results.flatMap((result) => result.scores.filter((score) => score.name === name));
    const passed = scores.filter((score) => score.score === 1).length;
    checks[name] = `${passed}/${scores.length}`;
  }
  return {
    file,
    cases: results.length,
    scored: results.filter((result) => result.score !== null).length,
    passed: results.filter((result) => result.score === "pass").length,
    checks,
  };
}
