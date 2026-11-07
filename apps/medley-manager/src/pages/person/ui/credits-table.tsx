import { Array, pipe } from "effect";
import type { ReactNode } from "react";

import { usePerson } from "#/pages/person/api/use-person";
import { Table } from "#/shared/ui/table";
import { TableBody } from "#/shared/ui/table-body";
import { TableHeadings } from "#/shared/ui/table-headings";

import { CreditRow } from "./credit-row";

const HEADINGS = ["動画", "No.", "曲", "担当"];

const CreditsTable = (): ReactNode => {
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

export { CreditsTable };
