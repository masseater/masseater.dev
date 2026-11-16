import { readWantedLockfile } from "@pnpm/lockfile.fs";
import { Effect, Option, Record as Rec, pipe } from "effect";

import { LockfileUnreadable } from "./lockfile-unreadable.ts";

/** @internal */
export const lockedPackages = (
  root: string,
): Effect.Effect<Option.Option<readonly string[]>, LockfileUnreadable> =>
  Effect.tryPromise({
    try: () => readWantedLockfile(root, { ignoreIncompatible: false }),
    catch: (cause) => LockfileUnreadable.make({ root, reason: String(cause) }),
  }).pipe(
    Effect.map((lockfile) =>
      pipe(
        Option.fromNullishOr(lockfile),
        Option.flatMap(({ packages }) => Option.fromUndefinedOr(packages)),
        Option.map(Rec.keys),
      ),
    ),
  );
