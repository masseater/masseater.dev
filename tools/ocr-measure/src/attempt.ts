import { Duration, Effect } from "effect";

type Attempt<Value> =
  | Readonly<{ status: "done"; value: Value }>
  | Readonly<{ status: "failed"; reason: string }>;

interface Timed<Value> {
  readonly seconds: number;
  readonly attempt: Attempt<Value>;
}

const NOTHING = 0;

const timed = <Value, Failure extends Readonly<{ reason: string }>, Requirements>(
  effect: Effect.Effect<Value, Failure, Requirements>,
): Effect.Effect<Timed<Value>, never, Requirements> =>
  effect.pipe(
    Effect.match({
      onSuccess: (value): Attempt<Value> => ({ status: "done", value }),
      onFailure: ({ reason }): Attempt<Value> => ({ status: "failed", reason }),
    }),
    Effect.timed,
    Effect.map(([duration, attempt]) => ({ seconds: Duration.toSeconds(duration), attempt })),
  );

const skipped = <Value>(reason: string): Timed<Value> => ({
  seconds: NOTHING,
  attempt: { status: "failed", reason },
});

const costOf = (attempt: Attempt<Readonly<{ costUsd: number }>>): number => {
  if (attempt.status === "done") {
    return attempt.value.costUsd;
  }
  return NOTHING;
};

export { costOf, skipped, timed };
export type { Attempt, Timed };
