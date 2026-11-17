import { readWantedLockfile } from "@pnpm/lockfile.fs";
import { Effect, Option, Record as Rec } from "effect";

import { LockfileUnreadable } from "./lockfile-unreadable.ts";

export type WantedLockfile = NonNullable<Awaited<ReturnType<typeof readWantedLockfile>>>;

/** @internal */
export const wantedLockfile = (
  root: string,
): Effect.Effect<Option.Option<WantedLockfile>, LockfileUnreadable> =>
  Effect.tryPromise({
    try: () => readWantedLockfile(root, { ignoreIncompatible: false }),
    catch: (cause) => LockfileUnreadable.make({ root, reason: String(cause) }),
  }).pipe(Effect.map(Option.fromNullishOr));

/** @internal */
export const lockedPackages = (
  root: string,
): Effect.Effect<Option.Option<readonly string[]>, LockfileUnreadable> =>
  wantedLockfile(root).pipe(
    Effect.map(Option.flatMap(({ packages }) => Option.fromUndefinedOr(packages))),
    Effect.map(Option.map(Rec.keys)),
  );
