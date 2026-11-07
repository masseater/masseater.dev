import type { ReactNode } from "react";

import { PersonLink } from "#/entities/catalog";
import { TableCell } from "#/shared/ui/table-cell";
import { TableRow } from "#/shared/ui/table-row";

type PersonSummary = Readonly<{ id: number; name: string; creditCount: number }>;

const PersonRow = ({ person }: Readonly<{ person: PersonSummary }>): ReactNode => (
  <TableRow>
    <TableCell>
      <PersonLink id={person.id} name={person.name} />
    </TableCell>
    <TableCell variant="count">{`${person.creditCount.toString()} パート`}</TableCell>
  </TableRow>
);

export { PersonRow };
