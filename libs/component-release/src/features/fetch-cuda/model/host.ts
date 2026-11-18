import {
  Array as Arr,
  Config,
  Effect,
  FileSystem,
  Option,
  Path,
  Record as Rec,
  String as Str,
  pipe,
} from "effect";

import { output } from "#/shared/lib/command.ts";

import type { Platform } from "./platform.ts";

const VSWHERE = String.raw`C:\Program Files (x86)\Microsoft Visual Studio\Installer\vswhere.exe`;

const VCVARSALL = String.raw`VC\Auxiliary\Build\vcvarsall.bat`;

const FIRST = 0;

const NEXT = 1;

const SEARCH_PATH = /^path$/iu;

/** @internal */
export interface Toolkit {
  readonly platform: Platform;
  readonly toolkit: string;
  readonly computeCap: string;
  readonly msvc: Option.Option<string>;
}

/** @internal */
export interface Environment {
  readonly env: Readonly<Record<string, string>>;
  readonly complete: boolean;
}

const assignments = (text: string): Readonly<Record<string, string>> =>
  pipe(
    Str.split(text, "\n"),
    Arr.map(Str.trim),
    Arr.map((line) =>
      pipe(
        Str.indexOf("=")(line),
        Option.filter((index) => index > FIRST),
        Option.map((index): readonly [string, string] => [
          Str.slice(FIRST, index)(line),
          Str.slice(index + NEXT)(line),
        ]),
      ),
    ),
    Arr.getSomes,
    Rec.fromEntries,
  );

const developerShell = Effect.fn("cuda.msvc")(function* developerShell(
  toolkit: string,
  version: string,
) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const installation = yield* output({
    file: VSWHERE,
    args: ["-latest", "-products", "*", "-property", "installationPath"],
  });
  const script = path.join(path.dirname(toolkit), "msvc.bat");
  yield* fileSystem.writeFileString(
    script,
    `@call "${path.join(installation, VCVARSALL)}" x64 -vcvars_ver=${version} >nul && set\r\n`,
  );
  const printed = yield* output({ file: "cmd.exe", args: ["/d", "/c", script] });
  return assignments(printed);
});

const baseOf = (
  platform: Platform,
  toolkit: string,
  msvc: Option.Option<string>,
): Effect.Effect<
  Option.Option<Readonly<Record<string, string>>>,
  Effect.Error<ReturnType<typeof developerShell>>,
  Effect.Services<ReturnType<typeof developerShell>>
> => {
  if (!platform.windows || Option.isNone(msvc)) {
    return Effect.succeedNone;
  }
  return developerShell(toolkit, msvc.value).pipe(Effect.asSome);
};

const withSearchPath = (
  env: Readonly<Record<string, string>>,
  first: string,
  delimiter: string,
): Readonly<Record<string, string>> => {
  const key = pipe(
    Rec.keys(env),
    Arr.findFirst((name) => SEARCH_PATH.test(name)),
    Option.getOrElse(() => "PATH"),
  );
  const rest = pipe(
    Rec.get(env, key),
    Option.getOrElse(() => ""),
  );
  return Rec.set(env, key, Arr.join([first, rest], delimiter));
};

/** @internal */
export const environmentOf = Effect.fn("cuda.environment")(function* environmentOf({
  platform,
  toolkit,
  computeCap,
  msvc,
}: Toolkit) {
  const path = yield* Path.Path;
  const searchPath = yield* Config.String("PATH").pipe(Config.withDefault(""));
  const developer = yield* baseOf(platform, toolkit, msvc);
  const cuda: Readonly<Record<string, string>> = {
    CUDA_PATH: toolkit,
    CUDA_HOME: toolkit,
    CUDA_COMPUTE_CAP: computeCap,
    ...platform.compiler,
  };
  const base = pipe(
    developer,
    Option.getOrElse((): Readonly<Record<string, string>> => ({ PATH: searchPath })),
  );
  const env = withSearchPath({ ...base, ...cuda }, path.join(toolkit, "bin"), platform.delimiter);
  return { env, complete: Option.isSome(developer) } satisfies Environment;
});
