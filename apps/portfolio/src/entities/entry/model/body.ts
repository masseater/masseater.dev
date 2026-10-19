import { Array as Arr, Effect, Option, Record as Rec, pipe } from "effect";
import type { MDXModule } from "mdx/types";

import { contentPath } from "./content";
import type { Entry } from "./entry";

const once = <Value>(load: () => Promise<Value>): (() => Promise<Value>) => {
  let started: Option.Option<Promise<Value>> = Option.none();
  return () =>
    Option.getOrElse(started, () => {
      const loading = load();
      started = Option.some(loading);
      return loading;
    });
};

const loaders = Rec.toEntries(import.meta.glob<MDXModule>("/content/*/*.md"));

const bodies = new Map(
  pipe(
    loaders,
    Arr.map(([path, load]) => [path, once(load)] as const),
  ),
);

const findBody = (
  location: Readonly<Pick<Entry, "category" | "slug">>,
): Option.Option<() => Promise<MDXModule>> =>
  Option.fromUndefinedOr(bodies.get(contentPath(location)));

const preloadBody = (location: Readonly<Pick<Entry, "category" | "slug">>): Effect.Effect<void> =>
  Option.match(findBody(location), {
    onNone: () => Effect.void,
    onSome: (load) => Effect.asVoid(Effect.promise(load)),
  });

export { findBody, preloadBody };
