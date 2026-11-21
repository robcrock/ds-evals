import { Badge } from "@/components/ui/badge";
import type { ScoredResult } from "../api.ts";
import { DecisionPreview } from "./decision-preview.tsx";
import { ScoreEditor } from "./score-editor.tsx";

export function CaseCard(props: {
  file: string;
  result: ScoredResult;
  readOnly: boolean;
  onSaved: (result: ScoredResult) => void;
}) {
  const { result } = props;
  return (
    <article className="bg-card text-card-foreground flex flex-col gap-4 rounded-xl border p-4 shadow-sm">
      <header className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-sm font-semibold">{result.testCaseId}</span>
        <Badge variant="secondary">{result.difficulty}</Badge>
        <Badge variant="outline">{result.category}</Badge>
        <span className="ml-auto flex flex-wrap gap-1">
          {result.scores.map((score) => (
            <Badge key={score.name} variant={score.score === 1 ? "default" : "destructive"} title={JSON.stringify(score.metadata ?? {})}>
              {score.score === 1 ? "✓" : "✗"} {score.name}
            </Badge>
          ))}
        </span>
      </header>

      <p className="text-sm">{result.input}</p>

      <ul className="text-muted-foreground list-disc space-y-0.5 pl-5 text-xs">
        {result.expectedCharacteristics.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      {result.decision ? (
        <DecisionPreview decision={result.decision} />
      ) : (
        <div className="space-y-2">
          <p className="text-destructive text-sm font-medium">{result.error ?? "No decision"}</p>
          <pre className="bg-muted overflow-x-auto rounded-md p-3 text-xs whitespace-pre-wrap">{result.response || "(empty response)"}</pre>
        </div>
      )}

      <ScoreEditor {...props} />
    </article>
  );
}
