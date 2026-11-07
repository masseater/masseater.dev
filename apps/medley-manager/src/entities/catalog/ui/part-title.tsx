import { Option } from "effect";
import type { ReactNode } from "react";

import type { Named } from "#/entities/catalog/lib/part";

import { SongLink } from "./song-link";

const PartTitle = ({
  song,
  label,
}: Readonly<{ song: Named | null; label: string | null }>): ReactNode =>
  Option.match(Option.fromNullOr(song), {
    onNone: () => <span className="text-base font-bold">{label}</span>,
    onSome: (found) => (
      <span className="flex flex-col gap-1">
        <span className="text-base font-bold">
          <SongLink id={found.id} title={found.title} />
        </span>
        <span className="text-muted-foreground text-sm">{label}</span>
      </span>
    ),
  });

export { PartTitle };
