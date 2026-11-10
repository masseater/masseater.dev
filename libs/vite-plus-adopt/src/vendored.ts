import { Effect } from "effect";
import type { FileSystem, Path, PlatformError } from "effect";
import type { ChildProcessSpawner } from "effect/process";

import type { Binary } from "./binaries.ts";
import type { VpToolsError } from "./errors.ts";
import { locateBinary } from "./install.ts";
import { runCaptured } from "./process.ts";
import type { Invocation } from "./process.ts";
import type { Report } from "./report.ts";

const runVendored = (
  binary: Binary,
  invocation: Omit<Invocation, "file">,
): Effect.Effect<
  Report,
  VpToolsError | PlatformError.PlatformError,
  ChildProcessSpawner.ChildProcessSpawner | FileSystem.FileSystem | Path.Path
> => locateBinary(binary).pipe(Effect.flatMap((file) => runCaptured({ ...invocation, file })));

export { runVendored };
