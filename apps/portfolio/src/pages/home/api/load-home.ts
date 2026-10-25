import { Array as Arr, Effect, pipe } from "effect";

import { allEntries } from "#/entities/entry";
import type { Entry } from "#/entities/entry";
import { topicsOf } from "#/pages/home/model/topics";

type HomeData = Readonly<{ projects: readonly Entry[]; topics: readonly string[] }>;

const loadHome = (): Promise<HomeData> =>
  Effect.runPromise(
    allEntries.pipe(
      Effect.map((entries) => ({
        projects: pipe(
          entries,
          Arr.filter(({ category }) => category === "projects"),
        ),
        topics: topicsOf(entries),
      })),
    ),
  );

export type { HomeData };
export { loadHome };
