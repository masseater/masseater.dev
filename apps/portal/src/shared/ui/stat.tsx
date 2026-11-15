import type { ReactNode } from "react";

export const Stat = ({
  label,
  note,
  tone,
  unit,
  value,
}: Readonly<{
  label: string;
  note?: ReactNode;
  tone?: "income" | "expense" | "plain";
  unit?: string;
  value: string;
}>): ReactNode => (
  <section
    className="bg-card text-card-foreground data-[tone=expense]:[&_h2]:text-expense-strong data-[tone=income]:[&_h2]:text-income-strong flex min-w-0 flex-col gap-2 rounded-xl border p-5"
    data-tone={tone ?? "plain"}
  >
    <h2 className="text-std-16B-170 text-muted-foreground">{label}</h2>
    <p className="flex items-baseline gap-1">
      <span className="text-std-32B-150 tabular-nums">{value}</span>
      <span className="text-muted-foreground text-sm">{unit}</span>
    </p>
    <div className="text-muted-foreground min-h-5 text-sm">{note}</div>
  </section>
);
