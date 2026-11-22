import { Button } from "@/components/ui/button";
import type { ScoredResult } from "../api.ts";
import { CaseChecks, CaseIdentity, CaseOutput, CasePrompt } from "./case-card.tsx";
import { ScoreEditor } from "./score-editor.tsx";

const stepButton =
  "inline-flex min-h-11 items-center rounded-md border px-3 text-sm transition-[background-color,transform] duration-150 ease-out hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40";

export type Study = {
  error: string | null;
  readOnly: boolean;
  results: ScoredResult[];
  visible: ScoredResult[];
  file: string | null;
  current: ScoredResult | undefined;
  replace: (result: ScoredResult) => void;
  clearFilters: () => void;
  pending: boolean;
  showPending: boolean;
  retry: () => void;
  previous: ScoredResult | undefined;
  next: ScoredResult | undefined;
  onCase: (id: string) => void;
};

export function CaseStudy(props: Study) {
  const result = props.file && props.current ? props.current : undefined;
  return (
    <div className="flex flex-col gap-10">
      <PageTitle />
      <StudyStatus {...props} />
      {result ? (
        <article className="flex flex-col gap-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <CaseIdentity result={result} />
            <Pager {...props} />
          </div>
          <PromptGroup result={result} />
          <GradeGroup props={props} result={result} />
        </article>
      ) : null}
    </div>
  );
}

function PageTitle() {
  return (
    <h1 id="main" tabIndex={-1} className="text-2xl font-semibold tracking-tight text-balance outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
      Label decisions
    </h1>
  );
}

function Pager({ previous, next, onCase }: Pick<Study, "previous" | "next" | "onCase">) {
  return (
    <div className="flex shrink-0 gap-2">
      <button type="button" className={stepButton} disabled={!previous} onClick={() => previous && onCase(previous.testCaseId)}>
        Previous
      </button>
      <button type="button" className={stepButton} disabled={!next} onClick={() => next && onCase(next.testCaseId)}>
        Next
      </button>
    </div>
  );
}

function StudyStatus(props: Study) {
  const { error, readOnly, results, visible, file, current, clearFilters, pending, showPending, retry } = props;
  return (
    <div className="contents">
      <div aria-live="assertive" aria-atomic="true" className="sr-only">
        {error ?? ""}
      </div>
      {error ? (
        <div className="flex flex-col items-start gap-2">
          <p className="text-destructive text-sm">{error}</p>
          <Button type="button" variant="outline" className="h-11" onClick={retry}>
            Try again
          </Button>
        </div>
      ) : null}
      {showPending && !current && !error && (
        <div className="flex min-h-80 items-center" role="status">
          <p className="text-muted-foreground text-sm">Loading this run.</p>
        </div>
      )}
      {!pending && !file && !error && (
        <div className="flex min-h-80 flex-col items-center justify-center gap-2 text-center">
          <h2 className="text-base font-medium text-balance">No runs yet</h2>
          <p className="text-muted-foreground max-w-[65ch] text-base text-pretty sm:text-sm">
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
        <div className="flex min-h-80 flex-col items-center justify-center gap-2 text-center">
          <h2 className="text-base font-medium text-balance">No cases match these filters</h2>
          <p className="text-muted-foreground max-w-[65ch] text-base text-pretty sm:text-sm">
            The run still has {results.length} cases. Clear the filters to see them.
          </p>
          <Button type="button" className="h-11 active:scale-[0.97]" onClick={clearFilters}>
            Show all cases
          </Button>
        </div>
      )}
    </div>
  );
}

function PromptGroup({ result }: { result: ScoredResult }) {
  return (
    <div className="flex flex-col gap-3">
      <CasePrompt result={result} />
      <CaseChecks result={result} />
    </div>
  );
}

function GradeGroup({ props, result }: { props: Study; result: ScoredResult }) {
  return (
    <div className="flex flex-col gap-4">
      <CaseOutput result={result} />
      <ScoreEditor file={props.file ?? ""} result={result} readOnly={props.readOnly} onSaved={props.replace} className="flex flex-col gap-4" />
    </div>
  );
}

