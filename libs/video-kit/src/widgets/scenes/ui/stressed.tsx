import type { ReactNode } from "react";

import { popIn } from "#/shared/ui/motion.ts";
import { Run } from "#/shared/ui/run.tsx";

const STRESS_START = 1.5;
const WAITING = { "--shown": 1 } as const;

export const Stressed = ({
  text,
  at,
  frame,
}: Readonly<{ text: string; at: number; frame: number }>): ReactNode => {
  if (frame < at) {
    return (
      <Run className="text-telop" vars={WAITING}>
        {text}
      </Run>
    );
  }
  return (
    <Run
      className="motion text-highlight inline-block"
      vars={popIn({ frame, at, start: STRESS_START })}
    >
      {text}
    </Run>
  );
};
