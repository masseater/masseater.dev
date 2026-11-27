import { Array as Arr, Effect, Option, Record as Rec, pipe } from "effect";
import type { MDXModule } from "mdx/types";

import { once } from "#/shared/lib/index.ts";

import { contentPath } from "./content.ts";
import type { Entry } from "./entry.ts";

const loadBodies = (): Map<string, () => Promise<MDXModule>> => {
  const loaders = Rec.toEntries(import.meta.glob<MDXModule>("/content/*/*.md"));
  return new Map(
    pipe(
      loaders,
      Arr.map(([path, load]) => [path, once(load)] as const),
    ),
  );
};

const bodies = once(loadBodies);

const loaded = new Map<string, MDXModule>();

export const findBody = (
  location: Readonly<Pick<Entry, "category" | "slug">>,
): Option.Option<() => Promise<MDXModule>> =>
  Option.fromUndefinedOr(bodies().get(contentPath(location)));

export const findLoadedBody = (
  location: Readonly<Pick<Entry, "category" | "slug">>,
): Option.Option<MDXModule> => Option.fromUndefinedOr(loaded.get(contentPath(location)));

export const preloadModule = (
  location: Readonly<Pick<Entry, "category" | "slug">>,
): Effect.Effect<void> =>
  Option.match(findBody(location), {
    onNone: () => Effect.void,
    onSome: (load) =>
      Effect.promise(load).pipe(
        Effect.map((body) => loaded.set(contentPath(location), body)),
        Effect.asVoid,
      ),
  });
