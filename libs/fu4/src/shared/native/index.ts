import { loadAddon } from "@masseater.dev/lint-host";
import { Predicate } from "effect";
import type { Effect } from "effect";

import type { Fu4Config } from "#/shared/config/index.ts";
import { failedWith } from "#/shared/lib/errors.ts";
import type { Fu4Error } from "#/shared/lib/errors.ts";

export interface NativeDiagnostic {
  readonly line: number;
  readonly column: number;
  readonly message: string;
  readonly kind: string;
}

export interface NativeResult {
  readonly path: string;
  readonly diagnostics: readonly NativeDiagnostic[];
}

export interface NativeOptions {
  readonly config?: Fu4Config;
  readonly traceparent?: string;
}

export interface Native {
  readonly lintPaths: (
    root: string,
    paths: readonly string[],
    options: NativeOptions,
  ) => readonly NativeResult[];
  readonly flushTelemetry: () => Promise<void>;
}

const isNative = (value: unknown): value is Native =>
  Predicate.hasProperty(value, "lintPaths") &&
  Predicate.isFunction(value.lintPaths) &&
  Predicate.hasProperty(value, "flushTelemetry") &&
  Predicate.isFunction(value.flushTelemetry);

export const native: Effect.Effect<Native, Fu4Error> = loadAddon({
  packageName: "@r_masseater/fu4",
  binary: "fu4",
  from: import.meta.url,
  isAddon: isNative,
  failWith: failedWith,
});
