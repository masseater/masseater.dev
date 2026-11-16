import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { ASPECTS } from "#/shared/config/labels";

import { AspectChip } from "./aspect-chip.tsx";

export const AspectChips = (): ReactNode => (
  <fieldset aria-label="どこが" className="m-0 flex min-w-0 flex-wrap gap-1 border-0 p-0">
    {pipe(
      ASPECTS,
      Arr.map((aspect) => <AspectChip key={aspect} aspect={aspect} />),
    )}
  </fieldset>
);
