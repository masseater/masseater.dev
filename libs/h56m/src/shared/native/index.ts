import { loadAddon } from "@masseater.dev/lint-host";
import { Predicate } from "effect";
import type { Effect } from "effect";

import type { H56mConfig } from "#/shared/config/index.ts";
import { failedWith } from "#/shared/lib/errors.ts";
import type { H56mError } from "#/shared/lib/errors.ts";

export interface DetectorInput {
  readonly config: Omit<H56mConfig, "ignoredSecrets">;
  readonly ignored: readonly string[];
  readonly traceparent?: string;
}

export interface TextInput {
  readonly path: string;
  readonly text: string;
  readonly traceparent?: string;
}

export interface GitInput {
  readonly root: string;
  readonly source: unknown;
  readonly traceparent?: string;
}

export interface NativeDetector {
  readonly scan: (input: TextInput) => unknown;
  readonly scanGit: (input: GitInput) => unknown;
}

export interface Native {
  readonly SecretDetector: new (input: DetectorInput) => NativeDetector;
  readonly flushTelemetry: () => Promise<void>;
}

const isNative = (value: unknown): value is Native =>
  Predicate.hasProperty(value, "SecretDetector") &&
  Predicate.isFunction(value.SecretDetector) &&
  Predicate.hasProperty(value, "flushTelemetry") &&
  Predicate.isFunction(value.flushTelemetry);

export const native: Effect.Effect<Native, H56mError> = loadAddon({
  packageName: "@r_masseater/h56m",
  binary: "h56m",
  from: import.meta.url,
  isAddon: isNative,
  failWith: failedWith,
});
