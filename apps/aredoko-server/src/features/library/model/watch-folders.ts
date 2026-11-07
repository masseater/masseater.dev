import { Array, Effect, Queue, Stream } from "effect";

import { packageChanges } from "./package-changes.ts";
import { folderSources } from "./scan-folders.ts";

const SETTLE_MILLIS = 2000;
const PENDING_CHANGES = 1;

/** @internal */
const watchSources = Effect.fn("watchSources")(function* watchSourceFolders(
  onChange: Effect.Effect<void>,
) {
  const changes = yield* Queue.sliding<boolean>(PENDING_CHANGES);
  const watch = folderSources().pipe(
    Effect.map(Array.map(({ path }) => path)),
    Effect.andThen((paths) => packageChanges(paths, SETTLE_MILLIS)),
    Effect.andThen(Stream.runForEach(() => onChange)),
    Effect.catchCause((cause) => Effect.logError("watch failed", cause)),
    Effect.andThen(Effect.never),
    Effect.raceFirst(Queue.take(changes)),
  );
  yield* watch.pipe(Effect.forever, Effect.forkScoped);
  return { sourcesChanged: Queue.offer(changes, true).pipe(Effect.asVoid) };
});

export { watchSources };
