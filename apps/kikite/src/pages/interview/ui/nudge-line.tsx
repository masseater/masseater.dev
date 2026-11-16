import { Option } from "effect";
import type { ReactNode } from "react";

import { useNudge } from "#/entities/interview/index.ts";
import { phrased } from "#/shared/lib/phrases.ts";

export const NudgeLine = (): ReactNode =>
  Option.match(useNudge(), {
    onNone: () => <p className="min-h-7" />,
    onSome: ({ text }) => (
      <p className="text-foreground/70 animate-in fade-in min-h-7 text-center text-lg text-balance break-keep duration-1000">
        {phrased(text)}
      </p>
    ),
  });
