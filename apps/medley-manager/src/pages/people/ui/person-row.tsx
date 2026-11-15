import type { ReactNode } from "react";

import { PersonLink } from "#/entities/person/index.ts";
import { TableCell } from "#/shared/ui/table-cell.tsx";
import { TableRow } from "#/shared/ui/table-row.tsx";

type PersonSummary = Readonly<{ id: number; name: string; creditCount: number }>;

export const PersonRow = ({ person }: Readonly<{ person: PersonSummary }>): ReactNode => (
  <TableRow>
    <TableCell>
      <PersonLink id={person.id} name={person.name} />
    </TableCell>
    <TableCell variant="count">{`${person.creditCount.toString()} パート`}</TableCell>
  </TableRow>
);
