import { Array, pipe } from "effect";
import type { ReactNode } from "react";

import { usePerson } from "#/pages/person/api/use-person.ts";
import { TableBody } from "#/shared/ui/table-body.tsx";
import { TableHeadings } from "#/shared/ui/table-headings.tsx";
import { Table } from "#/shared/ui/table.tsx";

import { CreditRow } from "./credit-row";

const HEADINGS = ["動画", "No.", "曲", "担当"];

export const CreditsTable = (): ReactNode => {
  const { credits } = usePerson();
  return (
    <Table>
      <TableHeadings labels={HEADINGS} />
      <TableBody>
        {pipe(
          credits,
          Array.map((credit) => (
            <CreditRow key={`${credit.part.id.toString()}-${credit.role}`} credit={credit} />
          )),
        )}
      </TableBody>
    </Table>
  );
};
