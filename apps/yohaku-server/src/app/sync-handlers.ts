import { failed } from "@masseater.dev/local-server";
import { Effect } from "effect";

import { Syncer } from "#features/sync";

import type { Handlers } from "./handler-types.ts";

const status = Effect.fn("readSyncStatus")(function* readSyncStatus() {
  const syncer = yield* Syncer;
  return yield* failed(syncer.status);
});

const signIn = Effect.fn("beginSyncSignIn")(function* beginSyncSignIn() {
  const syncer = yield* Syncer;
  const url = yield* failed(syncer.signIn);
  return { url };
});

/** @internal */
const syncHandlers = {
  ReadSyncStatus: status,
  BeginSyncSignIn: signIn,
} satisfies Pick<Handlers, "ReadSyncStatus" | "BeginSyncSignIn">;

export { syncHandlers };
