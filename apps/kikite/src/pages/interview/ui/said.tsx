import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { useInterim, useStage } from "#/pages/interview/model/hooks";

const Said = (): ReactNode => (
  <p className="text-muted-foreground text-lg leading-relaxed">
    {pipe(
      useStage().said,
      Arr.map((entry) => entry.text),
      Arr.join(" "),
    )}{" "}
    <span className="opacity-60">{useInterim()}</span>
  </p>
);

export { Said };
