import { Array as Arr, Effect, Option, Record as Rec, pipe } from "effect";
import type { MDXModule } from "mdx/types";

import { contentPath } from "./content";
import type { Entry } from "./entry";

const once = <Value>(make: () => Value): (() => Value) => {
  let made: Option.Option<Value> = Option.none();
  return () =>
    Option.getOrElse(made, () => {
      const value = make();
      made = Option.some(value);
      return value;
    });
};

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

const findBody = (
  location: Readonly<Pick<Entry, "category" | "slug">>,
): Option.Option<() => Promise<MDXModule>> =>
  Option.fromUndefinedOr(bodies().get(contentPath(location)));

const preloadBody = (location: Readonly<Pick<Entry, "category" | "slug">>): Effect.Effect<void> =>
  Option.match(findBody(location), {
    onNone: () => Effect.void,
    onSome: (load) => Effect.asVoid(Effect.promise(load)),
  });

export { findBody, preloadBody };
