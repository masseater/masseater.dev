import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { Array, pipe } from "effect";
import type { ReactNode } from "react";

import { catalogQueries } from "#/entities/catalog";
import { Table } from "#/shared/ui/table";
import { TableBody } from "#/shared/ui/table-body";
import { TableHeadings } from "#/shared/ui/table-headings";

import { SongRow } from "./song-row";

const route = getRouteApi("/songs/");

const HEADINGS = ["曲", "アーティスト", "使用動画"];

const SongsTable = (): ReactNode => {
  const filter = route.useSearch();
  const { data: songs } = useSuspenseQuery(catalogQueries.songs.get.queryOptions(filter));
  return (
    <Table>
      <TableHeadings labels={HEADINGS} />
      <TableBody>
        {pipe(
          songs,
          Array.map((song) => <SongRow key={song.id} song={song} />),
        )}
      </TableBody>
    </Table>
  );
};

export { SongsTable };
