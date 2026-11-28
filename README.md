# ds-evals

Playground for evals on AI agents: pi + Braintrust + shadcn/ui.

## Label suite

The first suite asks Pi for one label decision per case: the component (`Button` or `Link`), the visible text, and the accessible name. Twelve cases live in `evals/datasets/golden.json`. The contract lives in `src/contract.ts`.

```bash
cp .env.example .env
# set OPENAI_API_KEY
pnpm eval
```

The run writes `evals/results/<timestamp>.json`. Schema, Component, and ForbiddenLabel are filled in automatically. Score wording pass or fail with `evals/rubric.md`, either in the gallery below or by filling in `score` (`"pass"` or `"fail"`) and `notes` by hand.

`pnpm log` sends the newest results file to the Braintrust project `DS evals`. Set `BRAINTRUST_API_KEY` in `.env`. The project is created on the first log if it does not exist yet.

## Gallery

```bash
pnpm gallery
```

Opens a local page with one case at a time. The case is a trace: the prompt, the model reply, the parse, the rendered control, the checks, and the judgment. The first miss starts open. Mark the wording pass or fail under the trace to save it into that results file. Filter by failures, difficulty, or category, and switch runs with the picker.

Before your first `pnpm eval`, the gallery shows `gallery/fixtures/sample-results.json`, a read-only sample run.

`pnpm test` checks the parser, the runner, the golden file, and the gallery's results API without calling a model.
