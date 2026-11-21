export const CONTRACT = `You label one control in a design system.

Components:
- Button starts an action and stays on this page.
- Link goes to another page or another URL.

Labels:
- Visible text says what will happen, or where the link goes.
- visibleText is null only when the control has no visible text.
- An icon-only control still has an accessible name.
- When visible text exists, the accessible name matches it.
- Never use "Click here", "Here", "Submit", or "OK" as the visible text or the accessible name.
- Do not invent a product action the request never named. A vague request still uses Button, and the name restates the request instead of a made-up action such as delete, pay, or publish.`;
