import { cn } from "@masseater.dev/ui/cn";
import type { ReactNode } from "react";

import { SIGNED_YEN } from "#/entities/money";

const NONE = 0;

export const TransactionLine = ({
  amount,
  description,
}: Readonly<{ amount: number; description: string }>): ReactNode => (
  <div className="flex items-baseline justify-between gap-4">
    <p className="min-w-0 text-sm break-words">{description}</p>
    <p className={cn("font-display shrink-0 tabular-nums", amount > NONE && "text-income")}>
      {SIGNED_YEN.format(amount)}
    </p>
  </div>
);
