import type { Pair } from "@masseater.dev/shirushi-protocol";
import { Array as Arr, Predicate, pipe } from "effect";
import type { ReactNode } from "react";

import { usePairs } from "#/entities/taste/index.ts";
import { doneLast } from "#/shared/lib/index.ts";

import { PairCard } from "./pair-card.tsx";

const answered = ({ choice }: Pair): boolean => Predicate.isNotNull(choice);

const EMPTY = "二択はまだありません";

export const PairList = (): ReactNode => {
  const pairs = usePairs();
  if (!Arr.isReadonlyArrayNonEmpty(pairs)) {
    return <p className="text-muted-foreground py-6 text-center text-sm">{EMPTY}</p>;
  }
  return (
    <ul className="divide-border grid divide-y">
      {pipe(
        doneLast(answered)(pairs),
        Arr.map((pair) => <PairCard key={pair.id} pair={pair} />),
      )}
    </ul>
  );
};
