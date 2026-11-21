# ds-evals

Playground for evals on AI agents: pi + Braintrust + shadcn/ui.

## Label suite

The first suite asks Pi for one label decision per case: the component (`Button` or `Link`), the visible text, and the accessible name. Twelve cases live in `evals/datasets/golden.json`. The contract lives in `src/contract.ts`.

```bash
cp .env.example .env
# set OPENAI_API_KEY
pnpm eval
```

The run writes `evals/results/<timestamp>.json`. Schema, Component, and ForbiddenLabel are filled in automatically. Score wording from 1 to 5 with `evals/rubric.md` by filling in `score` and `notes`.

`pnpm log` sends the newest results file to the Braintrust project `DS evals`. Set `BRAINTRUST_API_KEY` in `.env`. The project is created on the first log if it does not exist yet.

`pnpm test` checks the parser, the runner, and the golden file without calling a model.
