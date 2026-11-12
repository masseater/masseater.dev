import { Clock, Effect } from "effect";
import { SqlClient } from "effect/sql";

/** @internal */
const logReaction = Effect.fn("logReaction")(function* logReaction(reaction: string) {
  const sql = yield* SqlClient.SqlClient;
  const now = yield* Clock.currentTimeMillis;
  yield* sql`insert into reactions (reaction, at) values (${reaction}, ${now})`;
});

export { logReaction };
