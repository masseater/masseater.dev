import {
  Array as Arr,
  Clock,
  Effect,
  Fiber,
  FileSystem,
  Number as Num,
  Option,
  Ref,
  Stream,
  String as Str,
  pipe,
} from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/process";

const KILOBYTE = 1024;

const MEGABYTE = KILOBYTE * KILOBYTE;

const INTERVAL = "10 millis";

const NOTHING = 0;

const RSS = /^VmRSS:\s+(?<kilobytes>\d+) kB$/mu;

export type Run = Readonly<{ command: string; cwd: string }>;

const read = Effect.fn(function* read(file: string) {
  const fileSystem = yield* FileSystem.FileSystem;
  return yield* fileSystem.readFileString(file).pipe(Effect.orElseSucceed(() => ""));
});

const childrenOf = (text: string): readonly string[] =>
  pipe(Str.split(text, " "), Arr.filter(Str.isNonEmpty));

const treeOf = (pid: string): Effect.Effect<readonly string[], never, FileSystem.FileSystem> =>
  read(`/proc/${pid}/task/${pid}/children`).pipe(
    Effect.flatMap((text) => Effect.forEach(childrenOf(text), treeOf, { concurrency: 1 })),
    Effect.map((children) => [pid, ...Arr.flatten(children)]),
  );

const kilobytesIn = (status: string): number =>
  pipe(
    Option.fromNullishOr(RSS.exec(status)),
    Option.flatMap((found) => Option.fromNullishOr(found.groups)),
    Option.flatMap((groups) => Option.fromNullishOr(groups["kilobytes"])),
    Option.map(Number),
    Option.getOrElse(() => NOTHING),
  );

const rssOf = (pid: string): Effect.Effect<number, never, FileSystem.FileSystem> =>
  read(`/proc/${pid}/status`).pipe(Effect.map((status) => kilobytesIn(status) * KILOBYTE));

const treeRss = (pid: string): Effect.Effect<number, never, FileSystem.FileSystem> =>
  treeOf(pid).pipe(
    Effect.flatMap((pids) => Effect.forEach(pids, rssOf, { concurrency: 1 })),
    Effect.map(Num.sumAll),
  );

const samplePeak = (
  peak: Ref.Ref<number>,
  pid: string,
): Effect.Effect<never, never, FileSystem.FileSystem> =>
  treeRss(pid).pipe(
    Effect.flatMap((rss) => Ref.update(peak, Num.max(rss))),
    Effect.delay(INTERVAL),
    Effect.forever,
  );

/** @internal */
export const sampleRun = Effect.fn("measure.sample")(function* sampleRun({ command, cwd }: Run) {
  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
  const peak = yield* Ref.make(NOTHING);
  const started = yield* Clock.currentTimeMillis;
  const handle = yield* spawner.spawn(
    ChildProcess.make("bash", ["-c", command], { cwd, extendEnv: true, stderr: "ignore" }),
  );
  const sampler = yield* Effect.forkScoped(samplePeak(peak, String(handle.pid)));
  const stdout = yield* handle.stdout.pipe(Stream.decodeText, Stream.mkString);
  const finished = yield* handle.exitCode.pipe(Effect.andThen(Clock.currentTimeMillis));
  const rss = yield* Fiber.interrupt(sampler).pipe(Effect.andThen(Ref.get(peak)));
  return { millis: finished - started, peakRssMegabytes: rss / MEGABYTE, stdout };
}, Effect.scoped);
