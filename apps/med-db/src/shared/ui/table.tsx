import { Table as BaseTable } from "@masseater.dev/ui/table";
import type { ReactNode } from "react";

export const Table = ({
  label,
  children,
}: Readonly<{ label: string; children: ReactNode }>): ReactNode => (
  <BaseTable label={label} containerClassName="bg-card rounded-xl border">
    {children}
  </BaseTable>
);
