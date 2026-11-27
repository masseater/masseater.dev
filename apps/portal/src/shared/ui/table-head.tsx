import { ColumnHeadings } from "@masseater.dev/ui/table";
import type { ColumnHeading } from "@masseater.dev/ui/table";
import type { ReactNode } from "react";

export const TableHead = ({
  columns,
}: Readonly<{ columns: readonly ColumnHeading[] }>): ReactNode => (
  <ColumnHeadings columns={columns} variant="ruled" />
);
