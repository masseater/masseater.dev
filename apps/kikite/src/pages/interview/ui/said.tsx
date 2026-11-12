import { cn } from "@masseater.dev/ui/cn";
import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { useInterim, useStage } from "#/pages/interview/model/hooks";

const ALIGNS = {
  start: "text-left",
  center: "text-center text-balance",
} as const;

const Said = ({ align }: Readonly<{ align: keyof typeof ALIGNS }>): ReactNode => (
  <p className={cn("text-foreground/80 min-h-7 text-lg leading-relaxed", ALIGNS[align])}>
    {pipe(
      useStage().said,
      Arr.map((entry) => entry.text),
      Arr.join(" "),
    )}{" "}
    {useInterim()}
  </p>
);

export { Said };
