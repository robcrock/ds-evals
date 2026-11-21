import { useState } from "react";
import { Button } from "@/components/ui/button";
import { saveHumanScore, type ScoredResult } from "../api.ts";

type HumanScore = ScoredResult["score"];
const SCORES = [1, 2, 3, 4, 5] as const;

export function ScoreEditor({
  file,
  result,
  readOnly,
  onSaved,
}: {
  file: string;
  result: ScoredResult;
  readOnly: boolean;
  onSaved: (result: ScoredResult) => void;
}) {
  const [notes, setNotes] = useState(result.notes ?? "");
  const [status, setStatus] = useState<string | null>(null);

  async function save(score: HumanScore, nextNotes: string) {
    setStatus("Saving...");
    try {
      onSaved({ ...result, ...(await saveHumanScore(file, result.testCaseId, { score, notes: nextNotes })) });
      setStatus("Saved");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <div className="space-y-2 border-t pt-3">
      <div className="flex items-center gap-1">
        <span className="text-muted-foreground mr-2 text-xs">Wording (1-5)</span>
        {SCORES.map((score) => (
          <Button
            key={score}
            size="sm"
            variant={result.score === score ? "default" : "outline"}
            disabled={readOnly}
            aria-pressed={result.score === score}
            onClick={() => save(result.score === score ? null : score, notes)}
          >
            {score}
          </Button>
        ))}
        {status && <span className="text-muted-foreground ml-auto text-xs">{status}</span>}
      </div>
      <textarea
        className="bg-background min-h-16 w-full rounded-md border px-3 py-2 text-sm shadow-xs disabled:opacity-50"
        placeholder="Notes"
        aria-label={`Notes for ${result.testCaseId}`}
        value={notes}
        disabled={readOnly}
        onChange={(event) => setNotes(event.target.value)}
        onBlur={() => notes !== (result.notes ?? "") && save(result.score, notes)}
      />
    </div>
  );
}
