import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import type { Shot } from "#/entities/cut/index.ts";

const GAP = "　";

export const Credits = ({ shot }: Readonly<{ shot: Shot }>): ReactNode => (
  <p className="font-jp text-credit text-muted japanese horizontal:text-credit-h text-center font-bold">
    {pipe(shot.credits, Arr.join(GAP))}
  </p>
);
