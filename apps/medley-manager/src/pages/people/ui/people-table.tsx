import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { Array, pipe } from "effect";
import type { ReactNode } from "react";

import { catalogQueries } from "#/entities/catalog/index.ts";
import { TableBody } from "#/shared/ui/table-body.tsx";
import { TableHeadings } from "#/shared/ui/table-headings.tsx";
import { Table } from "#/shared/ui/table.tsx";

import { PersonRow } from "./person-row";

const route = getRouteApi("/people/");

const HEADINGS = ["名前", "担当パート"];

export const PeopleTable = (): ReactNode => {
  const filter = route.useSearch();
  const { data: people } = useSuspenseQuery(catalogQueries.people.get.queryOptions(filter));
  return (
    <Table>
      <TableHeadings labels={HEADINGS} />
      <TableBody>
        {pipe(
          people,
          Array.map((person) => <PersonRow key={person.id} person={person} />),
        )}
      </TableBody>
    </Table>
  );
};
