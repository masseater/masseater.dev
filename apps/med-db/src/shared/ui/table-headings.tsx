import { ColumnHeadings } from "@masseater.dev/ui/table";
import { Array, pipe } from "effect";
import type { ReactNode } from "react";

export const TableHeadings = ({ labels }: Readonly<{ labels: readonly string[] }>): ReactNode => (
  <ColumnHeadings
    variant="tinted"
    columns={pipe(
      labels,
      Array.map((label) => ({ label })),
    )}
  />
);
