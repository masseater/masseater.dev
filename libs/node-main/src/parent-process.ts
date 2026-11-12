import { Duration, Effect, Option, Schedule, pipe } from "effect";

const PARENT_CHECK_INTERVAL = Duration.fromInputUnsafe("2 seconds");
const SIGNAL_PROBE = 0;

const isAlive = (pid: number): boolean => {
  try {
    return globalThis.process.kill(pid, SIGNAL_PROBE);
  } catch {
    return false;
  }
};

const untilExits = (pid: number): Effect.Effect<void> =>
  Effect.sync(() => isAlive(pid)).pipe(
    Effect.repeat({ schedule: Schedule.spaced(PARENT_CHECK_INTERVAL), while: (alive) => alive }),
    Effect.asVoid,
  );

const whileParentAlive =
  (parentPid: Option.Option<string>) =>
  <Value, Failure, Requirements>(
    program: Effect.Effect<Value, Failure, Requirements>,
  ): Effect.Effect<void, Failure, Requirements> =>
    Effect.raceFirst(
      Effect.asVoid(program),
      pipe(
        parentPid,
        Option.map((pid) => untilExits(globalThis.Number(pid))),
        Option.getOrElse(() => Effect.never),
      ),
    );

export { whileParentAlive };
