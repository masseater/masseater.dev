import type { Effect } from "effect";
import { Option, pipe } from "effect";

import type { LifeReadValue, Body } from "#/entities/life-record";
import type { StoreFailure } from "#/shared/api";

import { lifeDigest } from "./life-digest.server.ts";
import { lifeRead } from "./life-read.server.ts";
import { lifeRevisions } from "./life-revisions.server.ts";

const revisionsRef = (input: LifeReadValue): Option.Option<string> =>
  pipe(
    Option.fromUndefinedOr(input.ref),
    Option.filter(() => input.revisions === true),
  );

const listing = (input: LifeReadValue): Effect.Effect<Body, StoreFailure> => {
  if (input.record === "digest") {
    return lifeDigest(input);
  }
  return lifeRead(input);
};

const routeLifeRead = (input: LifeReadValue): Effect.Effect<Body, StoreFailure> =>
  Option.match(revisionsRef(input), {
    onSome: lifeRevisions,
    onNone: () => listing(input),
  });

export { routeLifeRead };
