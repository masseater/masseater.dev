import { Array as Arr, Effect, FileSystem, Option, Path, String as Str, pipe } from "effect";

import { RuntimeFailed, entries, named, outputLines } from "./runtime-files.ts";

const VSWHERE = "C:/Program Files (x86)/Microsoft Visual Studio/Installer/vswhere.exe";
const SYSTEM32 = "C:/Windows/System32";
const WINDOWS_BINARY = /\.(?:exe|dll)$/iu;
const DEPENDENT = /^ +\S+\.dll\s*$/iu;
const WINDOWS_API_SET = /^(?:api|ext)-ms-win-/iu;

type Tools = Readonly<{ llama: string; crt: string; dumpbin: string }>;

const vsFind = Effect.fn("vsFind")(function* vsFind(pattern: string) {
  const found = yield* outputLines(VSWHERE, ["-latest", "-products", "*", "-find", pattern]);
  const paths = pipe(found, Arr.map(Str.trim), Arr.filter(Str.isNonEmpty));
  return Arr.match(paths, {
    onEmpty: () => Option.none<string>(),
    onNonEmpty: (nonEmpty) => Option.some(Arr.max(nonEmpty, Str.Order)),
  });
});

const dependentsOf = Effect.fn("dependentsOf")(function* dependentsOf(
  dumpbin: string,
  file: string,
) {
  const output = yield* outputLines(dumpbin, ["-nologo", "-dependents", file]);
  return pipe(
    output,
    Arr.filter((line) => DEPENDENT.test(line)),
    Arr.map(Str.trim),
  );
});

const allDependents = Effect.fn("allDependents")(function* allDependents({
  llama,
  dumpbin,
}: Tools) {
  const binaries = yield* entries(llama).pipe(Effect.map(named(WINDOWS_BINARY)));
  const names = yield* pipe(
    binaries,
    Effect.forEach(({ file }) => dependentsOf(dumpbin, file)),
  );
  return Arr.dedupe(Arr.flatten(names));
});

const missingFrom = Effect.fn("missingFrom")(function* missingFrom({
  directories,
  names,
}: Readonly<{ directories: readonly string[]; names: readonly string[] }>) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const isAnywhere = (name: string): Effect.Effect<boolean> =>
    pipe(
      directories,
      Effect.forEach((directory) => fs.exists(path.join(directory, name)).pipe(Effect.orDie)),
      Effect.map(Arr.some(Boolean)),
    );
  return yield* pipe(
    names,
    Effect.filter((name) => Effect.map(isAnywhere(name), (found) => !found)),
  );
});

const copyCrt = Effect.fn("copyCrt")(function* copyCrt(tools: Tools) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const names = yield* allDependents(tools);
  const absent = yield* missingFrom({ directories: [tools.llama], names });
  const notInCrt = yield* missingFrom({ directories: [tools.crt], names: absent });
  const copied = Arr.difference(absent, notInCrt);
  yield* Effect.forEach(
    copied,
    (name) => fs.copyFile(path.join(tools.crt, name), path.join(tools.llama, name)),
    { discard: true },
  );
  return Arr.isReadonlyArrayNonEmpty(copied);
});

const checkDependents = Effect.fn("checkDependents")(function* checkDependents(tools: Tools) {
  const names = yield* allDependents(tools);
  const own = pipe(
    names,
    Arr.filter((name) => !WINDOWS_API_SET.test(name)),
  );
  const unresolved = yield* missingFrom({ directories: [tools.llama, SYSTEM32], names: own });
  if (Arr.isReadonlyArrayNonEmpty(unresolved)) {
    return yield* RuntimeFailed.make({
      message: `${Arr.join(unresolved, ", ")} is neither shipped nor part of Windows`,
    });
  }
  return yield* Effect.void;
});

/** @internal */
const shipMsvcRuntime = Effect.fn("shipMsvcRuntime")(function* shipMsvcRuntime(llama: string) {
  const crt = yield* vsFind("VC/Redist/MSVC/*/x64/Microsoft.VC*.CRT");
  const dumpbin = yield* vsFind("VC/Tools/MSVC/*/bin/Hostx64/x64/dumpbin.exe");
  const found = Option.all({ crt, dumpbin });
  if (Option.isNone(found)) {
    return yield* RuntimeFailed.make({
      message:
        "the Visual C++ redistributable or dumpbin was not found; install Visual Studio with the C++ workload",
    });
  }
  const tools = { llama, ...found.value };
  yield* copyCrt(tools).pipe(Effect.repeat({ while: (copied) => copied }));
  return yield* checkDependents(tools);
});

export { shipMsvcRuntime };
