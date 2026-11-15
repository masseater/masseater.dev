import { output } from "@masseater.dev/component-release";
import { Array as Arr, Effect, FileSystem, Option, Order, Path, String as Str, pipe } from "effect";
import type { PlatformError } from "effect";
import type { ChildProcessSpawner } from "effect/process";

const VSWHERE = String.raw`C:\Program Files (x86)\Microsoft Visual Studio\Installer\vswhere.exe`;
const SYSTEM32 = String.raw`C:\Windows\System32`;
const CRT = "VC/Redist/MSVC/*/x64/Microsoft.VC*.CRT";
const DUMPBIN = "VC/Tools/MSVC/*/bin/Hostx64/x64/dumpbin.exe";
const DEPENDENT = /^ +\S+\.dll$/iu;
const BINARY = /\.(?:exe|dll)$/iu;
const API_SET = /^(?:api|ext)-ms-win-/iu;

/** @internal */
export type Tools = Readonly<{ llama: string; crt: string; dumpbin: string }>;

/** @internal */
export type Dependent = Readonly<{ file: string; name: string }>;

type Requirements = FileSystem.FileSystem | Path.Path | ChildProcessSpawner.ChildProcessSpawner;

const linesOf = (text: string): readonly string[] =>
  pipe(Str.split(text, "\n"), Arr.map(Str.trimEnd), Arr.filter(Str.isNonEmpty));

const latest = Effect.fn("msvc.latest")(function* latest(pattern: string) {
  const found = yield* output({
    file: VSWHERE,
    args: ["-latest", "-products", "*", "-find", pattern],
  });
  const last = Arr.last(Arr.sort(linesOf(found), Order.String));
  if (Option.isNone(last)) {
    return yield* Effect.die(
      `${pattern} was not found; install Visual Studio with the C++ workload`,
    );
  }
  return last.value;
});

const dependents = Effect.fn("msvc.dependents")(function* dependents(
  dumpbin: string,
  file: string,
) {
  const listed = yield* output({ file: dumpbin, args: ["-nologo", "-dependents", file] });
  return pipe(
    linesOf(listed),
    Arr.filter((line) => DEPENDENT.test(line)),
    Arr.map((line): Dependent => ({ file, name: Str.trim(line) })),
  );
});

const allDependents = Effect.fn("msvc.allDependents")(function* allDependents(
  llama: string,
  dumpbin: string,
) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const names = yield* fileSystem.readDirectory(llama);
  const listed = yield* pipe(
    names,
    Arr.filter((name) => BINARY.test(name)),
    Effect.forEach((name) => dependents(dumpbin, path.join(llama, name))),
  );
  return Arr.flatten(listed);
});

const absentFrom = Effect.fn("msvc.absentFrom")(function* absentFrom(
  directory: string,
  name: string,
) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const present = yield* fileSystem.exists(path.join(directory, name));
  return !present;
});

const shippable = Effect.fn("msvc.shippable")(function* shippable(
  { llama, crt }: Tools,
  name: string,
) {
  const absent = yield* absentFrom(llama, name);
  const unavailable = yield* absentFrom(crt, name);
  return absent && !unavailable;
});

const foreign = Effect.fn("msvc.foreign")(function* foreign(llama: string, name: string) {
  const absent = yield* absentFrom(llama, name);
  const outsideWindows = yield* absentFrom(SYSTEM32, name);
  return absent && outsideWindows;
});

const copyRuntime = (
  tools: Tools,
): Effect.Effect<void, PlatformError.PlatformError | Error, Requirements> =>
  Effect.gen(function* copied() {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const listed = yield* allDependents(tools.llama, tools.dumpbin);
    const names = pipe(
      listed,
      Arr.map(({ name }) => name),
      Arr.dedupe,
    );
    const flags = yield* pipe(
      names,
      Effect.forEach((name) => shippable(tools, name)),
    );
    const wanted = pipe(
      Arr.zip(names, flags),
      Arr.filter(([, shipped]) => shipped),
      Arr.map(([name]) => name),
    );
    if (Arr.isReadonlyArrayEmpty(wanted)) {
      return;
    }
    yield* pipe(
      wanted,
      Effect.forEach((name) =>
        fileSystem.copyFile(path.join(tools.crt, name), path.join(tools.llama, name)),
      ),
    );
    yield* copyRuntime(tools);
  });

const requireShipped = Effect.fn("msvc.requireShipped")(function* requireShipped(
  llama: string,
  dumpbin: string,
) {
  const listed = yield* allDependents(llama, dumpbin);
  const checked = pipe(
    listed,
    Arr.filter(({ name }) => !API_SET.test(name)),
  );
  const flags = yield* pipe(
    checked,
    Effect.forEach(({ name }) => foreign(llama, name)),
  );
  const lines = pipe(
    Arr.zip(checked, flags),
    Arr.filter(([, missing]) => missing),
    Arr.map(
      ([{ file, name }]) => `${file} needs ${name}, which is neither shipped nor part of Windows`,
    ),
  );
  if (Arr.isReadonlyArrayNonEmpty(lines)) {
    return yield* Effect.die(Arr.join(lines, "\n"));
  }
  return listed;
});

/** @internal */
export const shipMsvcRuntime = Effect.fn("msvc.shipMsvcRuntime")(function* shipMsvcRuntime(
  llama: string,
) {
  const crt = yield* latest(CRT);
  const dumpbin = yield* latest(DUMPBIN);
  yield* copyRuntime({ llama, crt, dumpbin });
  return yield* requireShipped(llama, dumpbin);
});
