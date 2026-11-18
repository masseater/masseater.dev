import {
  Array as Arr,
  Config,
  Effect,
  Option,
  Path,
  Record as Rec,
  String as Str,
  pipe,
} from "effect";

import { output } from "#/shared/lib/command.ts";

import type { Platform } from "./platform.ts";

const VSWHERE = String.raw`C:\Program Files (x86)\Microsoft Visual Studio\Installer\vswhere.exe`;

const CL = String.raw`VC\Tools\MSVC\**\bin\Hostx64\x64\cl.exe`;

const findCompiler = output({
  file: VSWHERE,
  args: ["-latest", "-products", "*", "-find", CL],
}).pipe(Effect.map((found) => pipe(Str.split(found, "\n"), Arr.head, Option.map(Str.trim))));

const hostCompiler = (platform: Platform): typeof findCompiler => {
  if (!platform.windows) {
    return Effect.succeedNone;
  }
  return findCompiler;
};

/** @internal */
export interface Toolkit {
  readonly platform: Platform;
  readonly toolkit: string;
  readonly computeCap: string;
}

/** @internal */
export const environmentOf = Effect.fn("cuda.environment")(function* environmentOf({
  platform,
  toolkit,
  computeCap,
}: Toolkit) {
  const path = yield* Path.Path;
  const searchPath = yield* Config.String("PATH").pipe(Config.withDefault(""));
  const compiler = yield* hostCompiler(platform);
  const base: Readonly<Record<string, string>> = {
    CUDA_PATH: toolkit,
    CUDA_HOME: toolkit,
    CUDA_COMPUTE_CAP: computeCap,
    PATH: Arr.join([path.join(toolkit, "bin"), searchPath], platform.delimiter),
  };
  return pipe(
    compiler,
    Option.match({
      onNone: () => base,
      onSome: (cl) => Rec.set(base, "NVCC_CCBIN", cl),
    }),
  );
});
