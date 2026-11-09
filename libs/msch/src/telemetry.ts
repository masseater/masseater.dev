import { Array as Arr, Effect, Number as Num, Option, String as Str, pipe } from "effect";

import type { API } from "./compiler.ts";
import { RepositoryFiles } from "./repository-files.ts";

const RSS_LINE = /^VmRSS:\s+(?<kib>\d+) kB$/mu;
const BYTES_PER_KIB = 1024;
const UNKNOWN_RSS = 0;

const kibibytesIn = (status: string): Option.Option<string> =>
  Option.fromNullishOr(RSS_LINE.exec(status)).pipe(
    Option.flatMap((match) => Option.fromUndefinedOr(match.groups)),
    Option.flatMap((groups) => Option.fromUndefinedOr(groups["kib"])),
  );

const residentBytesOf = (pid: string): Effect.Effect<number, never, RepositoryFiles> =>
  Effect.gen(function* residentBytes() {
    const files = yield* RepositoryFiles;
    const status = yield* files.readFile(`/proc/${pid}/status`);
    return pipe(
      status,
      Option.flatMap(kibibytesIn),
      Option.flatMap(Num.parse),
      Option.map((kib) => kib * BYTES_PER_KIB),
      Option.getOrElse(() => UNKNOWN_RSS),
    );
  });

const childPids = Effect.gen(function* childPids() {
  const files = yield* RepositoryFiles;
  const pid = String(process.pid);
  const children = yield* files.readFile(`/proc/${pid}/task/${pid}/children`);
  return pipe(
    children,
    Option.map((text) => pipe(Str.trim(text), Str.split(" "), Arr.filter(Str.isNonEmpty))),
    Option.getOrElse((): readonly string[] => []),
  );
});

const annotateMemory = Effect.gen(function* annotateMemory() {
  const own = yield* residentBytesOf(String(process.pid));
  const pids = yield* childPids;
  const children = yield* pipe(
    pids,
    Effect.forEach((pid) => residentBytesOf(pid)),
  );
  const { heapUsed } = process.memoryUsage();
  yield* Effect.annotateCurrentSpan({
    "process.memory.rss": own,
    "process.memory.heap_used": heapUsed,
    "msch.compiler.memory.rss": Num.sumAll(children),
  });
});

const annotateResources = (api: API): Effect.Effect<void, never, RepositoryFiles> =>
  Effect.gen(function* annotateCompiler() {
    yield* annotateMemory;
    const { totals } = api.getTimingInfo();
    yield* Effect.annotateCurrentSpan({
      "msch.compiler.requests": totals.requestCount,
      "msch.compiler.round_trip_ms": totals.roundTripMs,
      "msch.compiler.server_ms": totals.serverTimeMs,
    });
  });

export { annotateResources };
