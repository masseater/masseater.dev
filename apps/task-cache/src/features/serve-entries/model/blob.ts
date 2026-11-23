import { Effect, Option, pipe } from "effect";

import { blobIdOf, blobOf, entryOf } from "#/entities/entry/index.ts";
import { spendObjectReads } from "#/entities/spending/index.ts";
import { STATUS, status, stream } from "#/shared/lib/responses.ts";

const ONCE = 1;

export const readBlob = Effect.fn("serveEntries.readBlob")(function* readBlob(
  namespace: string,
  id: number,
) {
  const found = yield* entryOf(namespace, id);
  const entry = pipe(
    found,
    Option.filter((candidate) => Option.isSome(blobIdOf(candidate))),
  );
  if (Option.isNone(entry)) {
    return status(STATUS.notFound);
  }
  const affordable = yield* spendObjectReads(ONCE);
  if (!affordable) {
    return status(STATUS.notFound);
  }
  const blob = yield* blobOf(entry.value);
  return Option.match(blob, {
    onNone: () => status(STATUS.notFound),
    onSome: (stored) => stream(stored.length)(stored.body),
  });
});
