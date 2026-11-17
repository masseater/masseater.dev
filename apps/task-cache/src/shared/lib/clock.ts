import { DateTime, Effect } from "effect";

const MILLIS_PER_SECOND = 1000;

export const nowSeconds: Effect.Effect<number> = DateTime.now.pipe(
  Effect.map((now) => Math.floor(DateTime.toEpochMillis(now) / MILLIS_PER_SECOND)),
);
