# Case trace

Decided from `/proto/traces`.

- Direction: Steps. One flat row per span, opened in place.
- Each title is a sentence, and the sentence says when the span failed. The duration sits beside the title. A miss uses the error status.
- The first miss starts open. No decision opens Parse. A missed check opens Checks. A failed judgment opens Judgment. Otherwise the model reply is open.
- Rows stay open independently. Opening one does not close the others.

Rejected:

- Turn put the same rows behind one summary line, with a sentence between groups. A pass hid the log, and opening it was Steps again.
- Sheet kept the list from growing, but you could read only one span, and the panel covered the run rail.
