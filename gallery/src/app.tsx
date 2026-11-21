import { useEffect, useMemo, useState } from "react";
import { fetchRun, fetchRuns, type RunSummary, type ScoredResult } from "./api.ts";
import { CaseCard } from "./components/case-card.tsx";
import { CATEGORIES, DIFFICULTIES } from "../../src/types.ts";

const selectClass = "h-9 rounded-md border bg-background px-3 text-sm shadow-xs";

export function App() {
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [file, setFile] = useState<string | null>(null);
  const [results, setResults] = useState<ScoredResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [failuresOnly, setFailuresOnly] = useState(false);
  const [difficulty, setDifficulty] = useState("all");
  const [category, setCategory] = useState("all");

  useEffect(() => {
    fetchRuns()
      .then((list) => {
        setRuns(list);
        const requested = new URLSearchParams(window.location.search).get("run");
        setFile(list.find((item) => item.file === requested)?.file ?? list[0]?.file ?? null);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!file) return;
    fetchRun(file)
      .then((run) => setResults(run.results))
      .catch((err: Error) => setError(err.message));
  }, [file]);

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

  function replace(updated: ScoredResult) {
    setResults((current) => current.map((item) => (item.testCaseId === updated.testCaseId ? updated : item)));
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Label decisions</h1>
          <p className="text-muted-foreground text-sm">Pi's answers rendered as shadcn components. Score wording with evals/rubric.md.</p>
        </div>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Run</span>
          <select className={selectClass} value={file ?? ""} onChange={(event) => setFile(event.target.value)}>
            {runs.map((item) => (
              <option key={item.file} value={item.file}>
                {item.file} {item.source === "fixture" ? "(sample, read-only)" : `(${item.humanScored}/${item.cases} scored)`}
              </option>
            ))}
          </select>
        </label>
      </header>

      {error && <p className="text-destructive text-sm">{error}</p>}
      {readOnly && (
        <p className="bg-muted text-muted-foreground rounded-md px-3 py-2 text-sm">
          This is the committed sample run. Run <code>pnpm eval</code> to create a real one you can score.
        </p>
      )}

      <Summary results={results} />

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={failuresOnly} onChange={(event) => setFailuresOnly(event.target.checked)} />
          Failures only
        </label>
        <select className={selectClass} value={difficulty} onChange={(event) => setDifficulty(event.target.value)}>
          <option value="all">All difficulties</option>
          {DIFFICULTIES.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <select className={selectClass} value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="all">All categories</option>
          {CATEGORIES.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <span className="text-muted-foreground">
          Showing {visible.length} of {results.length}
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {file &&
          visible.map((result) => (
            <CaseCard key={`${file}:${result.testCaseId}`} file={file} result={result} readOnly={readOnly} onSaved={replace} />
          ))}
      </div>
    </div>
  );
}

function Summary({ results }: { results: ScoredResult[] }) {
  const names = [...new Set(results.flatMap((result) => result.scores.map((score) => score.name)))];
  const scored = results.filter((result) => result.score !== null).length;
  return (
    <dl className="bg-card grid grid-cols-2 gap-4 rounded-xl border p-4 sm:grid-cols-4">
      {names.map((name) => {
        const scores = results.flatMap((result) => result.scores.filter((score) => score.name === name));
        const passed = scores.filter((score) => score.score === 1).length;
        return (
          <div key={name}>
            <dt className="text-muted-foreground text-xs">{name}</dt>
            <dd className="text-lg font-semibold">
              {Math.round((passed / scores.length) * 100)}% <span className="text-muted-foreground text-sm font-normal">{passed}/{scores.length}</span>
            </dd>
          </div>
        );
      })}
      <div>
        <dt className="text-muted-foreground text-xs">Human scored</dt>
        <dd className="text-lg font-semibold">
          {scored}/{results.length}
        </dd>
      </div>
    </dl>
  );
}

function isFailure(result: ScoredResult): boolean {
  return Boolean(result.error) || result.scores.some((score) => score.score === 0);
}
