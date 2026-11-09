import type { Effect } from "effect";
import { Option, pipe } from "effect";

import type { StoreFailure } from "#/features/mcp/model/tool-failure";

import { lifeDigest } from "./life-digest.server";
import type { LifeReadValue } from "./life-input";
import { lifeRead } from "./life-read.server";
import type { Body } from "./life-record";
import { lifeRevisions } from "./life-revisions.server";

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
