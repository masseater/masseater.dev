import { Effect } from "effect";

import { allEntries } from "#/entities/entry";
import { topicsOf } from "#/pages/home/model/topics";

type HomeData = Readonly<{ topics: readonly string[] }>;

const loadHome = (): Promise<HomeData> =>
  Effect.runPromise(allEntries.pipe(Effect.map((entries) => ({ topics: topicsOf(entries) }))));

export type { HomeData };
export { loadHome };
