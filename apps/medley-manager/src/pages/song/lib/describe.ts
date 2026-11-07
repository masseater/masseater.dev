import { Array, Option, pipe } from "effect";

import { formatTime } from "#/entities/catalog";

type UsedAt = Readonly<{ position: number; startSec: number | null }>;

const usedAt = (part: UsedAt): string =>
  Option.match(Option.fromNullOr(part.startSec), {
    onNone: () => `No.${part.position.toString()}`,
    onSome: formatTime,
  });

const describeDirect = ({ parts }: Readonly<{ parts: readonly UsedAt[] }>): string =>
  pipe(
    parts,
    Array.map((part) => usedAt(part)),
    Array.join("、"),
  );

const describeIndirect = ({
  via,
}: Readonly<{ via: readonly Readonly<{ title: string }>[] }>): string =>
  `${pipe(
    via,
    Array.map((source) => source.title),
    Array.join("、"),
  )} 経由`;

export { describeDirect, describeIndirect };
