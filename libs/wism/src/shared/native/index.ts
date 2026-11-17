import { loadAddon } from "@masseater.dev/lint-host";
import { Predicate } from "effect";
import type { Effect } from "effect";

import type { Diagnostic, GraphEdge, GraphNode, Kind, Severity } from "#/shared/config/index.ts";
import { failedWith } from "#/shared/lib/errors.ts";
import type { WismError } from "#/shared/lib/errors.ts";

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

export const native: Effect.Effect<Native, WismError> = loadAddon({
  packageName: "@r_masseater/wism",
  binary: "wism",
  from: import.meta.url,
  isAddon: isNative,
  failWith: failedWith,
});
