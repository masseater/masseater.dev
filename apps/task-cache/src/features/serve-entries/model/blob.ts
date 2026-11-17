import { Effect, Option } from "effect";

import { blobOf, entryOf } from "#/entities/entry/index.ts";
import { STATUS, status, stream } from "#/shared/lib/responses.ts";

export const readBlob = Effect.fn("serveEntries.readBlob")(function* readBlob(
  namespace: string,
  id: number,
) {
  const entry = yield* entryOf(namespace, id);
  if (Option.isNone(entry)) {
    return status(STATUS.notFound);
  }
  const blob = yield* blobOf(entry.value);
  return Option.match(blob, {
    onNone: () => status(STATUS.notFound),
    onSome: (found) => stream(found.length)(found.body),
  });
});
