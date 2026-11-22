import { useLayoutEffect, useRef, useState, type MouseEvent } from "react";
import { computeAccessibleName } from "dom-accessibility-api";
import { Shapes } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LabelDecision } from "../../../src/types.ts";

// Renders Pi's decision as the real control, then reads the accessible name back from the DOM.
export function DecisionPreview({ decision }: { decision: LabelDecision }) {
  const ref = useRef<HTMLDivElement>(null);
  const [heard, setHeard] = useState<string | null>(null);

  useLayoutEffect(() => {
    const control = ref.current?.querySelector("button, a");
    setHeard(control ? computeAccessibleName(control) : null);
  }, [decision]);

  const iconOnly = decision.visibleText === null;
  const label = iconOnly ? decision.accessibleName : undefined;
  const content = iconOnly ? <Shapes aria-hidden="true" /> : decision.visibleText;

  return (
    <div className="space-y-2">
      <div ref={ref} className="bg-muted/50 flex min-h-20 items-center justify-center rounded-lg border border-dashed p-4">
        {decision.component === "Button" ? (
          <Button size={iconOnly ? "icon" : "default"} variant={iconOnly ? "outline" : "default"} aria-label={label}>
            {content}
          </Button>
        ) : (
          <Button asChild variant="link" className="underline">
            <a href="#" aria-label={label} onClick={(event: MouseEvent) => event.preventDefault()}>
              {content}
            </a>
          </Button>
        )}
      </div>
      <p className="text-sm">
        <span className="text-muted-foreground">Screen reader hears: </span>
        <span className="font-medium">“{heard ?? ""}”</span>
        <span className="text-muted-foreground">, {decision.component === "Button" ? "button" : "link"}</span>
      </p>
      {heard !== null && heard !== decision.accessibleName && (
        <p className="text-destructive text-sm">Pi declared the accessible name as “{decision.accessibleName}”.</p>
      )}
    </div>
  );
}
