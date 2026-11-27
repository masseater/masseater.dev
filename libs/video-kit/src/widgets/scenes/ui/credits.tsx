import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

const GAP = "　";

export const Credits = ({ credits }: Readonly<{ credits: readonly string[] }>): ReactNode => (
  <p className="font-text text-credit text-muted japanese horizontal:text-credit-h text-center">
    {pipe(credits, Arr.join(GAP))}
  </p>
);
