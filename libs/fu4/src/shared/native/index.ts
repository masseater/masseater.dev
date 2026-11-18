import { exposes, loadAddon } from "@masseater.dev/lint-host";
import type { Effect } from "effect";

import { failedWith } from "#/shared/lib/errors.ts";
import type { Fu4Error } from "#/shared/lib/errors.ts";

export { CONCRETE, FLAG, NONE, SEMANTIC, sourceView } from "./source.ts";
export type { SourceView } from "./source.ts";

export interface ParsedFile {
  readonly path: string;
  readonly source: Uint8Array;
}

export interface Native {
  readonly parsePaths: (
    root: string,
    paths: readonly string[],
    options: { readonly traceparent: string | undefined },
  ) => readonly ParsedFile[];
  readonly parseText: (text: string) => Uint8Array;
  readonly parseScript: (language: string, text: string) => Uint8Array;
  readonly readText: (root: string, path: string) => string | null;
  readonly pathExists: (root: string, path: string) => boolean;
  readonly flushTelemetry: () => Promise<void>;
}

const NATIVE_FUNCTIONS = [
  "parsePaths",
  "parseText",
  "parseScript",
  "readText",
  "pathExists",
  "flushTelemetry",
] as const;

const isNative = exposes<Native>(NATIVE_FUNCTIONS);

export const native: Effect.Effect<Native, Fu4Error> = loadAddon({
  packageName: "@r_masseater/fu4",
  binary: "fu4",
  from: import.meta.url,
  isAddon: isNative,
  failWith: failedWith,
});
