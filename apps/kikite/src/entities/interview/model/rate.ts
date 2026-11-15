import { Array as Arr, Option, pipe } from "effect";

import type { Entry, Rating } from "./atoms.ts";

type Rate = Readonly<{ id: number; rating: Rating }>;

const toggled = (current: Rating, chosen: Rating): Rating => {
  if (current === chosen) {
    return "unrated";
  }
  return chosen;
};

const rateEntry =
  (rating: Rating) =>
  (entry: Entry): Entry => {
    if (entry.kind === "question") {
      return { ...entry, rating: toggled(entry.rating, rating) };
    }
    return entry;
  };

const rated =
  ({ id, rating }: Rate) =>
  (entries: readonly Entry[]): readonly Entry[] =>
    pipe(
      entries,
      Arr.modify(id, rateEntry(rating)),
      Option.getOrElse(() => entries),
    );

export { rated };
