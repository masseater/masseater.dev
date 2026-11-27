import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { LABELS, VERDICTS } from "#/shared/config/index.ts";

import { VerdictButton } from "./verdict-button.tsx";

export const VerdictSwitch = ({ habit }: Readonly<{ habit: string }>): ReactNode => (
  <fieldset aria-label={LABELS.judge} className="inline-flex overflow-hidden rounded-md border">
    {pipe(
      VERDICTS,
      Arr.map((verdict) => <VerdictButton key={verdict} habit={habit} verdict={verdict} />),
    )}
  </fieldset>
);
