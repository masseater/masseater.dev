import type { ReactNode } from "react";

import { SongLink } from "#/entities/catalog";
import { TableCell } from "#/shared/ui/table-cell";
import { TableRow } from "#/shared/ui/table-row";

type SongSummary = Readonly<{ id: number; title: string; artist: string | null; useCount: number }>;

const countLabel = (count: number): string => `${count.toString()} 本`;

const SongRow = ({ song }: Readonly<{ song: SongSummary }>): ReactNode => (
  <TableRow>
    <TableCell>
      <SongLink id={song.id} title={song.title} />
    </TableCell>
    <TableCell variant="muted">{song.artist}</TableCell>
    <TableCell variant="count">{countLabel(song.useCount)}</TableCell>
  </TableRow>
);

export { SongRow };
