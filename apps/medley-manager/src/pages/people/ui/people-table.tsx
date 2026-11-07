import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { Array, pipe } from "effect";
import type { ReactNode } from "react";

import { catalogQueries } from "#/entities/catalog";
import { Table } from "#/shared/ui/table";
import { TableBody } from "#/shared/ui/table-body";
import { TableHeadings } from "#/shared/ui/table-headings";

import { PersonRow } from "./person-row";

const route = getRouteApi("/people/");

const HEADINGS = ["名前", "担当パート"];

const PeopleTable = (): ReactNode => {
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

export { PeopleTable };
