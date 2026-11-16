import type { ReactNode } from "react";

import { SongLink } from "#/entities/song/index.ts";
import { TableCell } from "#/shared/ui/table-cell.tsx";
import { TableRow } from "#/shared/ui/table-row.tsx";

type SongSummary = Readonly<{ id: number; title: string; artist: string | null; useCount: number }>;

const countLabel = (count: number): string => `${count.toString()} 本`;

export const SongRow = ({ song }: Readonly<{ song: SongSummary }>): ReactNode => (
  <TableRow>
    <TableCell>
      <SongLink id={song.id} title={song.title} />
    </TableCell>
    <TableCell variant="muted">{song.artist}</TableCell>
    <TableCell variant="count">{countLabel(song.useCount)}</TableCell>
  </TableRow>
);
