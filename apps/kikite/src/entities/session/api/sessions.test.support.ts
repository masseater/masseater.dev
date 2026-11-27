import { makeD1 } from "@masseater.dev/d1-test";
import { Effect } from "effect";

import { SessionsDb, sessionsDbOf } from "./session-store.ts";

const testD1 = makeD1({
  migrations: new URL("../../../../migrations/", import.meta.url).href,
  tables: ["sessions"],
});

export const { closeDatabase, resetDatabase } = testD1;

const sessionsDb = testD1.database.pipe(Effect.map(sessionsDbOf));

export const withSessions = <Success, Failure>(
  effect: Effect.Effect<Success, Failure, SessionsDb>,
): Effect.Effect<Success, Failure> =>
  effect.pipe(Effect.provideServiceEffect(SessionsDb, sessionsDb));
