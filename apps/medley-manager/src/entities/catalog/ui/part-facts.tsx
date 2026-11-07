import { Array, Option, pipe } from "effect";
import type { ReactNode } from "react";

import type { PartRow } from "#/entities/catalog/lib/part";

const FACTS = [
  { key: "bpm", label: "BPM" },
  { key: "bars", label: "小節" },
] as const;

const PartFacts = ({ part }: Readonly<{ part: PartRow }>): ReactNode =>
  pipe(
    FACTS,
    Array.flatMap(({ key, label }) =>
      Option.toArray(Option.map(Option.fromNullOr(part[key]), (value) => ({ key, label, value }))),
    ),
    Array.map(({ key, label, value }) => (
      <span key={key} className="rounded-full border px-2 py-0.5 text-xs">
        <span className="text-muted-foreground">{`${label} `}</span>
        <span className="font-bold tabular-nums">{value}</span>
      </span>
    )),
  );

export { PartFacts };
