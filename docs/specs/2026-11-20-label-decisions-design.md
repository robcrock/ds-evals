# Label decisions

The first suite measures one design-system decision: for a described moment in a screen, which component to use and what to name it. A component library and a consuming app are later viewers. This suite runs without them.

## What a case is

Each case is one control. The agent returns a label decision:

- `component`: `Button` or `Link`
- `visibleText`: the words on the control, or `null` when the control has no visible text
- `accessibleName`: the name a screen reader would announce. Required. Never empty.

`Button` starts an action and stays on the page. `Link` goes somewhere else.

A good decision names the action or the destination. "Click here", "Here", "Submit", and "OK" fail. An icon-only control still has an accessible name. A vague request must not invent a product action the user never named.

Two different wordings can both be right. The case lists characteristics, not one exact string.

## Layout

`src` is the thing under test. `evals` imports it.

- `src/types.ts` — `LabelDecision`, `TestCase`, `EvalResult`
- `src/contract.ts` — the Button and Link rules, as the system prompt text
- `src/task.ts` — the output rule and `parseDecision`
- `src/dataset.ts` — `parseCases`, which checks the golden file before a run
- `src/run-suite.ts` — one case through an agent port, then the whole list
- `src/pi-agent.ts` — the only module that imports Pi. Tools off, no project context, one fresh session per case
- `evals/datasets/golden.json` — twelve cases
- `evals/rubric.md` — pass or fail for wording
- `evals/run.ts` — `pnpm eval`. Loads `.env`, runs the suite, writes `evals/results/<timestamp>.json`

Results are gitignored. Each result includes the case, the raw reply, the parsed decision, the model id, the duration, and `score` and `notes` set to `null` so a person can fill them in.

## Golden set

Twelve cases: four simple, three medium, three hard, two edge.

Categories are `action-or-navigation`, `visible-text`, `accessible-name`, and `constraint`. Difficulties are `simple`, `medium`, `hard`, and `edge`. Every case has a unique id, a prompt, at least one characteristic, one difficulty, and one category.

## Runner

`pnpm eval` reads `OPENAI_API_KEY` from the environment or from `.env`. Existing environment variables win over the file.

Pi is called with tools disabled and with no skills, extensions, or project context files, so a case cannot see the golden set or the rubric. The system prompt is the contract plus the output rule. The user message is only the case prompt. Thinking level is `low`. The model is the one Pi resolves for this machine. The result records that model id.

A reply that is not the JSON object leaves `decision` null and sets `error` to `Response did not include a label decision.` An agent failure keeps the error message and a null decision.

## Scoring

Three scorers in `evals/scorers` run on every result. Each returns 0 or 1, plus metadata. A case with no `expectedComponent` omits the Component score.

- Schema: the reply parsed into a label decision.
- Component: `decision.component` matches `expectedComponent`.
- ForbiddenLabel: the visible text and the accessible name are not exactly "Click here", "Here", "Submit", or "OK", and neither contains the phrase "click here". "Subscribe" passes.

The pass-fail rubric judges wording a program should not freeze, such as whether "Save changes" names the action. A person sets `score` to `"pass"` or `"fail"` and may add `notes`. Both stay null until then. Braintrust stays unused until a later suite.

## Checks

`pnpm test` covers parsing a decision, rejecting a malformed one, running a case through a fake agent, the three scorers, and the golden file. `pnpm typecheck` covers the project. `pnpm eval` is the live run and needs a key.
