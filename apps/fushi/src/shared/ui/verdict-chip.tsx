import { cn } from "@masseater.dev/ui/cn";
import type { ReactNode } from "react";

import { VERDICT_LABELS } from "#/shared/config/index.ts";
import type { Verdict } from "#/shared/config/index.ts";

const TONES: Readonly<Record<Verdict, string>> = {
  keep: "bg-foreground text-background border-foreground",
  fix: "border-2 font-bold",
  suggest: "border-2 border-dotted",
  reject: "text-muted-foreground",
};

export const VerdictChip = ({ verdict }: Readonly<{ verdict: Verdict }>): ReactNode => (
  <span className={cn("inline-flex items-center rounded-sm border px-2 text-xs", TONES[verdict])}>
    {VERDICT_LABELS[verdict]}
  </span>
);
