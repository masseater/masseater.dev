import { useAtom } from "@effect/atom-react";
import { cn } from "@masseater.dev/ui/cn";
import { Option } from "effect";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { verdictAtom } from "#/features/judge-habit/model/decide.ts";
import { VERDICT_LABELS } from "#/shared/config/index.ts";
import type { Verdict } from "#/shared/config/index.ts";

export const VerdictButton = ({
  habit,
  verdict,
}: Readonly<{ habit: string; verdict: Verdict }>): ReactNode => {
  const [chosen, choose] = useAtom(verdictAtom(habit));
  const pick = useCallback(() => {
    choose(Option.some(verdict));
  }, [choose, verdict]);
  const on = Option.contains(chosen, verdict);
  return (
    <button
      type="button"
      aria-pressed={on}
      className={cn(
        "hover:bg-accent border-l px-4 py-1.5 text-sm first:border-l-0",
        on && "bg-foreground text-background hover:bg-foreground",
      )}
      onClick={pick}
    >
      {VERDICT_LABELS[verdict]}
    </button>
  );
};
