import { useEffect, useId, useMemo, useState } from "react";
import { fetchRun, fetchRuns, type RunSummary, type ScoredResult } from "./api.ts";
import { Button } from "@/components/ui/button";
import { CaseCard } from "./components/case-card.tsx";
import { CATEGORIES, DIFFICULTIES } from "../../src/types.ts";

const pagePad =
  "ps-[max(1.5rem,env(safe-area-inset-left))] pe-[max(1.5rem,env(safe-area-inset-right))] pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]";

export function App() {
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [file, setFile] = useState<string | null>(null);
  const [results, setResults] = useState<ScoredResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [failuresOnly, setFailuresOnly] = useState(false);
  const [difficulty, setDifficulty] = useState("all");
  const [category, setCategory] = useState("all");
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
          (difficulty === "all" || result.difficulty === difficulty) &&
          (category === "all" || result.category === category),
      ),
    [results, failuresOnly, difficulty, category],
  );

  const index = Math.max(0, visible.findIndex((item) => item.testCaseId === caseId));
  const current = visible[index];

  function clearFilters() {
    setFailuresOnly(false);
    setDifficulty("all");
    setCategory("all");
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable) return;
      if (target.closest("[role=slider]")) return;
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
  difficulty: string;
  setDifficulty: (value: string) => void;
  category: string;
  setCategory: (value: string) => void;
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
  return (
    <div className={`mx-auto grid w-full max-w-[90rem] items-start gap-8 ${pagePad} min-[52rem]:grid-cols-[16rem_minmax(0,1fr)] min-[84rem]:grid-cols-[16rem_minmax(0,42rem)_18rem]`}>
      <h1 className="order-1 text-2xl font-semibold tracking-tight text-balance min-[52rem]:col-span-2 min-[84rem]:col-span-3">Label decisions</h1>
      <div className="order-3 min-w-0 min-[52rem]:sticky min-[52rem]:top-6 min-[52rem]:order-2 min-[52rem]:max-h-[calc(100dvh-3rem)] min-[52rem]:overflow-auto min-[52rem]:overscroll-y-contain">
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
      <main className="order-2 min-w-0 min-[52rem]:order-3">
        <CasePane {...props} />
      </main>
      <div className="order-4 min-w-0 min-[52rem]:col-span-2 min-[52rem]:sticky min-[52rem]:top-6 min-[84rem]:col-span-1 min-[84rem]:max-h-[calc(100dvh-3rem)] min-[84rem]:overflow-auto min-[84rem]:overscroll-y-contain">
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
  difficulty: string;
  onDifficulty: (value: string) => void;
  category: string;
  onCategory: (value: string) => void;
  visible: ScoredResult[];
  total: number;
  currentId: string | undefined;
  onCase: (id: string) => void;
}) {
  const difficultyName = useId();
  const categoryName = useId();
  return (
    <nav aria-label="Cases" className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" className="size-4" checked={failuresOnly} onChange={(event) => onFailures(event.target.checked)} />
          Failures only
        </label>
        <fieldset className="m-0 flex flex-col border-0 p-0">
          <legend className="text-muted-foreground mb-1 text-xs">Difficulty</legend>
          <FilterChoice name={difficultyName} value="all" current={difficulty} onChange={onDifficulty} label="All difficulties" />
          {DIFFICULTIES.map((item) => (
            <FilterChoice key={item} name={difficultyName} value={item} current={difficulty} onChange={onDifficulty} label={item} />
          ))}
        </fieldset>
        <fieldset className="m-0 flex flex-col border-0 p-0">
          <legend className="text-muted-foreground mb-1 text-xs">Category</legend>
          <FilterChoice name={categoryName} value="all" current={category} onChange={onCategory} label="All categories" />
          {CATEGORIES.map((item) => (
            <FilterChoice key={item} name={categoryName} value={item} current={category} onChange={onCategory} label={item} />
          ))}
        </fieldset>
        {visible.length !== total && <p className="text-muted-foreground text-xs tabular-nums">Showing {visible.length} of {total}</p>}
      </div>
      <div className="flex flex-col gap-1">
        <h2 className="text-muted-foreground text-xs">Cases</h2>
        <ul className="flex flex-col">
          {visible.map((result) => {
            const selected = result.testCaseId === currentId;
            const grade = result.score === null ? "Not scored" : (SCORE_NAME[result.score] ?? "Scored");
            return (
              <li key={result.testCaseId}>
                <button
                  type="button"
                  aria-current={selected ? "true" : undefined}
                  onClick={() => onCase(result.testCaseId)}
                  className={`flex min-h-11 w-full flex-col items-start justify-center rounded-md px-2 py-1 text-left transition-[background-color] duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${selected ? "bg-accent" : "hover:bg-accent"}`}
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

function FilterChoice({ name, value, current, onChange, label }: { name: string; value: string; current: string; onChange: (value: string) => void; label: string }) {
  return (
    <label className="flex min-h-11 items-center gap-2 text-sm">
      <input type="radio" className="size-4" name={name} value={value} checked={current === value} onChange={() => onChange(value)} />
      {label}
    </label>
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
                  className={`flex min-h-11 w-full flex-col items-start justify-center rounded-md px-2 py-1 text-left transition-[background-color] duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${selected ? "bg-accent" : "hover:bg-accent"}`}
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

function CasePane({ error, readOnly, results, visible, file, current, replace, clearFilters, pending, showPending, retry }: Gallery) {
  return (
    <>
      {error && (
        <div className="flex flex-col items-start gap-2">
          <p className="text-destructive text-sm">{error}</p>
          <Button type="button" variant="outline" className="h-11 active:scale-[0.97]" onClick={retry}>
            Try again
          </Button>
        </div>
      )}
      {showPending && !current && !error && (
        <p className="text-muted-foreground text-sm" role="status">
          Loading this run.
        </p>
      )}
      {!pending && !file && !error && (
        <div className="flex min-h-80 flex-col items-center justify-center gap-2 rounded-xl border px-6 text-center">
          <h2 className="text-base font-medium text-balance">No runs yet</h2>
          <p className="text-muted-foreground text-sm">
            Run <code>pnpm eval</code> to create one you can score.
          </p>
        </div>
      )}
      {readOnly && (
        <p className="bg-muted text-muted-foreground rounded-md px-3 py-2 text-sm">
          This is the committed sample run. Run <code>pnpm eval</code> to create a real one you can score.
        </p>
      )}
      {visible.length === 0 && results.length > 0 && (
        <div className="flex min-h-80 flex-col items-center justify-center gap-2 rounded-xl border px-6 text-center">
          <h2 className="text-base font-medium text-balance">No cases match these filters</h2>
          <p className="text-muted-foreground text-sm">The run still has {results.length} cases. Clear the filters to see them.</p>
          <Button type="button" className="mt-2 h-11 active:scale-[0.97]" onClick={clearFilters}>
            Show all cases
          </Button>
        </div>
      )}
      {file && current && <CaseCard key={`${file}:${current.testCaseId}`} file={file} result={current} readOnly={readOnly} onSaved={replace} />}
    </>
  );
}

function isFailure(result: ScoredResult): boolean {
  return Boolean(result.error) || result.scores.some((score) => score.score === 0);
}

const SCORE_NAME: Record<number, string> = {
  1: "Failed",
  2: "Poor",
  3: "Acceptable",
  4: "Good",
  5: "Excellent",
};

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
    checks,
  };
}
