import { Option } from "effect";
import type { ReactNode } from "react";

import { useNudge } from "#/pages/interview/model/hooks";

const NudgeLine = (): ReactNode =>
  Option.match(useNudge(), {
    onNone: () => <p className="min-h-7" />,
    onSome: ({ text }) => (
      <p className="text-foreground/70 animate-in fade-in min-h-7 text-center text-lg duration-1000">
        {text}
      </p>
    ),
  });

export { NudgeLine };
