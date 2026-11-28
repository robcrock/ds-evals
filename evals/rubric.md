# Label decision rubric

Score each result pass or fail. Compare the parsed decision with that case's characteristics. Two different wordings can both pass.

| Score | Meaning |
| --- | --- |
| Pass (`"pass"`) | Every characteristic holds. The component, the visible text, and the accessible name agree. A different wording still passes when the name stays clear. |
| Fail (`"fail"`) | A characteristic misses. That includes the wrong component, a forbidden or vague label, a name that does not match the visible text, no decision, or a parse error. If you are unsure, fail. |

Schema, Component, and ForbiddenLabel are already in the results file. Those are automatic checks, each 0 or 1. This rubric is the separate pass-fail judgment for wording.

Write that judgment into `score` and `notes`. Leave `score` null until you decide.
