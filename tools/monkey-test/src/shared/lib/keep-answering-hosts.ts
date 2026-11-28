import { Array as Arr, Effect, Option, Order, pipe } from "effect";

const CONCURRENCY = 8;

export const keepAnsweringHosts = <Failure, Services>(
  input: Readonly<{
    hostnames: readonly string[];
    probe: (hostname: string) => Effect.Effect<Option.Option<string>, Failure, Services>;
  }>,
): Effect.Effect<readonly string[], Failure, Services> =>
  Effect.forEach(input.hostnames, input.probe, { concurrency: CONCURRENCY }).pipe(
    Effect.map((probes) =>
      pipe(
        probes,
        Arr.flatMap((found) => Option.toArray(found)),
        Arr.sortWith((name) => name, Order.String),
      ),
    ),
  );
