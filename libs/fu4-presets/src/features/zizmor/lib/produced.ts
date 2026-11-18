import { Array as Arr, Effect, pipe } from "effect";

import type { Drafts, Produced } from "#/features/zizmor/model/audit.ts";

const UNBOUNDED = { concurrency: "unbounded" } as const;

const isReady = (part: Drafts | Effect.Effect<Drafts>): part is Drafts => !Effect.isEffect(part);

export const pending = (part: Drafts | Effect.Effect<Drafts>): Effect.Effect<Drafts> => {
  if (isReady(part)) {
    return Effect.succeed(part);
  }
  return part;
};

const allPending = (parts: readonly Produced[]): Effect.Effect<Drafts> => {
  const effects = pipe(parts, Arr.map(pending));
  return Effect.map(Effect.all(effects, UNBOUNDED), Arr.flatten);
};

export const combined = (parts: readonly Produced[]): Produced => {
  const ready = pipe(parts, Arr.filter(isReady));
  if (ready.length === parts.length) {
    return Arr.flatten(ready);
  }
  return allPending(parts);
};

export const producedBy =
  <Item>(each: (item: Item) => Produced) =>
  (items: readonly Item[]): Produced =>
    combined(pipe(items, Arr.map(each)));
