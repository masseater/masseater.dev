import type { Aspect } from "@masseater.dev/shirushi-protocol";
import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { AspectChip } from "./aspect-chip.tsx";

export const AspectGroup = ({
  label,
  aspects,
}: Readonly<{ label: string; aspects: readonly Aspect[] }>): ReactNode => (
  <fieldset aria-label={label} className="m-0 flex min-w-0 items-start gap-2 border-0 p-0">
    <span aria-hidden className="text-muted-foreground w-4 shrink-0 pt-1.5 text-xs">
      {label}
    </span>
    <span className="flex min-w-0 flex-wrap gap-1">
      {pipe(
        aspects,
        Arr.map((aspect) => <AspectChip key={aspect} aspect={aspect} />),
      )}
    </span>
  </fieldset>
);
