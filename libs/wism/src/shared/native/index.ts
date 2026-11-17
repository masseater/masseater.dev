import { createRequire } from "node:module";

import { Effect, Predicate } from "effect";

import type { Diagnostic, GraphEdge, GraphNode, Kind, Severity } from "#/shared/config/index.ts";
import { WismError, failedWith } from "#/shared/lib/errors.ts";

import { addonFile, platformTarget } from "./file.ts";

export interface NativeOptions {
  readonly config: {
    readonly kinds: readonly Kind[];
    readonly rules: Readonly<Record<string, Severity>>;
  };
  readonly keepGraph?: boolean;
  readonly traceparent?: string;
}

export interface NativeReport {
  readonly diagnostics: readonly Diagnostic[];
  readonly nodes?: readonly GraphNode[];
  readonly edges?: readonly GraphEdge[];
}

export interface Native {
  readonly lint: (root: string, files: readonly string[], options: NativeOptions) => NativeReport;
  readonly flushTelemetry: () => Promise<void>;
}

const isNative = (value: unknown): value is Native =>
  Predicate.hasProperty(value, "lint") &&
  Predicate.isFunction(value.lint) &&
  Predicate.hasProperty(value, "flushTelemetry") &&
  Predicate.isFunction(value.flushTelemetry);

const requireFrom = createRequire(import.meta.url);

const loadFrom = (specifier: string): Effect.Effect<unknown, WismError> =>
  Effect.try({
    try: (): unknown => requireFrom(specifier),
    catch: failedWith(`could not load ${specifier}`),
  });

const PACKAGE = "@r_masseater/wism";

export const native: Effect.Effect<Native, WismError> = loadFrom(
  `${PACKAGE}-${platformTarget}`,
).pipe(
  Effect.catchTag("WismError", () => loadFrom(`${PACKAGE}/native/${addonFile}`)),
  Effect.filterOrFail(isNative, () =>
    WismError.make({ message: `no wism addon for ${platformTarget}` }),
  ),
);
