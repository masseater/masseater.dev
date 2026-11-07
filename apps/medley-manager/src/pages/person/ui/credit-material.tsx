import { Option } from "effect";
import type { ReactNode } from "react";

import { SongLink } from "#/entities/catalog";

type SongRef = Readonly<{ id: number; title: string }>;

const CreditMaterial = ({
  song,
  label,
}: Readonly<{ song: SongRef | null; label: string | null }>): ReactNode =>
  Option.fromNullOr(song).pipe(
    Option.match({
      onNone: () => label,
      onSome: (found) => <SongLink id={found.id} title={found.title} />,
    }),
  );

export { CreditMaterial };
