import { Effect, Function as Fn } from "effect";
import type { FileSystem, Path, PlatformError } from "effect";
import type { ChildProcessSpawner } from "effect/process";

import type { VpToolsError } from "#/shared/lib/errors.ts";
import { runCaptured } from "#/shared/lib/process.ts";
import type { Invocation } from "#/shared/lib/process.ts";
import type { Report } from "#/shared/lib/report.ts";

import type { Binary } from "./binaries.ts";
import { locateBinary } from "./install.ts";

const DATA_FIRST_ARITY = 2;

/** @internal */
export const runVendored: {
  (
    invocation: Omit<Invocation, "file">,
  ): (
    binary: Binary,
  ) => Effect.Effect<
    Report,
    VpToolsError | PlatformError.PlatformError,
    ChildProcessSpawner.ChildProcessSpawner | FileSystem.FileSystem | Path.Path
  >;
  (
    binary: Binary,
    invocation: Omit<Invocation, "file">,
  ): Effect.Effect<
    Report,
    VpToolsError | PlatformError.PlatformError,
    ChildProcessSpawner.ChildProcessSpawner | FileSystem.FileSystem | Path.Path
  >;
} = Fn.dual(
  DATA_FIRST_ARITY,
  (
    binary: Binary,
    invocation: Omit<Invocation, "file">,
  ): Effect.Effect<
    Report,
    VpToolsError | PlatformError.PlatformError,
    ChildProcessSpawner.ChildProcessSpawner | FileSystem.FileSystem | Path.Path
  > => locateBinary(binary).pipe(Effect.flatMap((file) => runCaptured({ ...invocation, file }))),
);
