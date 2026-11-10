import { Effect, Function as Fn } from "effect";
import type { FileSystem, Path, PlatformError } from "effect";
import type { ChildProcessSpawner } from "effect/process";

import type { Binary } from "./binaries.ts";
import type { VpToolsError } from "./errors.ts";
import { locateBinary } from "./install.ts";
import { runCaptured } from "./process.ts";
import type { Invocation } from "./process.ts";
import type { Report } from "./report.ts";

const DATA_FIRST_ARITY = 2;

const runVendored: {
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

/** @internal */
export { runVendored };
