import { loadAddon } from "@masseater.dev/lint-host";
import { Predicate } from "effect";
import type { Effect } from "effect";

import { failedWith } from "#/shared/lib/errors.ts";
import type { WismError } from "#/shared/lib/errors.ts";

export interface NativeOptions {
  readonly traceparent?: string;
}

export interface Native {
  readonly collect: (root: string, files: readonly string[], options: NativeOptions) => Uint32Array;
  readonly flushTelemetry: () => Promise<void>;
}

const isNative = (value: unknown): value is Native =>
  Predicate.hasProperty(value, "collect") &&
  Predicate.isFunction(value.collect) &&
  Predicate.hasProperty(value, "flushTelemetry") &&
  Predicate.isFunction(value.flushTelemetry);

export const native: Effect.Effect<Native, WismError> = loadAddon({
  packageName: "@r_masseater/wism",
  binary: "wism",
  from: import.meta.url,
  isAddon: isNative,
  failWith: failedWith,
});
export { decodeGraph } from "./graph.ts";
