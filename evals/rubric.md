# Label decision rubric

Score each result from 1 to 5. Compare the parsed decision with that case's characteristics. Two different wordings can both deserve a 5.

| Score | Meaning |
| --- | --- |
| 5 | Every characteristic holds. The component, the visible text, and the accessible name agree. |
| 4 | The component is right and the name is still clear. One small wording issue. |
| 3 | The component is right. The visible text or the accessible name is vague or slightly off. |
| 2 | The wrong component, or a forbidden label such as "Click here", with some of the requested intent still visible. |
| 1 | No decision, a parse error, or a label for a different control. |

The results file already contains Schema, Component, and ForbiddenLabel. Those are 0 or 1 checks. This rubric is the separate 1–5 judgment for wording.

Write that judgment into `score` and `notes`.
