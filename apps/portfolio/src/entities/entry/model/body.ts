import { Effect, Option } from "effect";
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

const bodies = new Map(
  Object.entries(import.meta.glob<MDXModule>("/content/*/*.md")).map(([path, load]) => [
    path,
    once(load),
  ]),
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
