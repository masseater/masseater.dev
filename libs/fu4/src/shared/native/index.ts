import { createRequire } from "node:module";

import { Effect, Predicate } from "effect";

import type { Fu4Config } from "#/shared/config/index.ts";
import { Fu4Error, failedWith } from "#/shared/lib/errors.ts";

import { addonFile, platformTarget } from "./file.ts";

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

const requireFrom = createRequire(import.meta.url);

const loadFrom = (specifier: string): Effect.Effect<unknown, Fu4Error> =>
  Effect.try({
    try: (): unknown => requireFrom(specifier),
    catch: failedWith(`could not load ${specifier}`),
  });

const PACKAGE = "@r_masseater/fu4";

export const native: Effect.Effect<Native, Fu4Error> = loadFrom(
  `${PACKAGE}-${platformTarget}`,
).pipe(
  Effect.catchTag("Fu4Error", () => loadFrom(`${PACKAGE}/native/${addonFile}`)),
  Effect.filterOrFail(isNative, () =>
    Fu4Error.make({ message: `no fu4 addon for ${platformTarget}` }),
  ),
);
