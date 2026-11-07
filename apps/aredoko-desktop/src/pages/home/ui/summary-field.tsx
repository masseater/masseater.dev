import { Array } from "effect";
import type { ReactNode } from "react";

const SummaryField = ({
  label,
  values,
}: Readonly<{ label: string; values: readonly string[] }>): ReactNode => (
  <div className="flex flex-col gap-1">
    <dt className="text-muted-foreground text-xs font-medium">{label}</dt>
    <dd className="text-sm">{Array.join(values, "、")}</dd>
  </div>
);

export { SummaryField };
