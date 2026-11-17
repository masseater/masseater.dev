import { loadAddon } from "@r_masseater/lint-host";
import { Array as Arr, Predicate, pipe } from "effect";
import type { Effect } from "effect";

import { failedWith } from "#/shared/lib/errors.ts";
import type { Y8Error } from "#/shared/lib/errors.ts";

export { FIELD, NODE_WORDS, TAGS, sourceView } from "./source.ts";
export type { SourceView } from "./source.ts";

export type NodeType =
  | "document"
  | "paragraph"
  | "heading"
  | "blockQuote"
  | "codeBlock"
  | "htmlBlock"
  | "list"
  | "listItem"
  | "footnoteDefinition"
  | "table"
  | "tableHead"
  | "tableRow"
  | "tableCell"
  | "emphasis"
  | "strong"
  | "strikethrough"
  | "link"
  | "image"
  | "text"
  | "code"
  | "html"
  | "inlineHtml"
  | "softBreak"
  | "hardBreak"
  | "thematicBreak"
  | "math"
  | "mathBlock"
  | "footnoteReference"
  | "taskListMarker"
  | "other";

export type Level = "error" | "warning" | "info";

export interface NativeDiagnostic {
  readonly line: number;
  readonly ruleNames: readonly string[];
  readonly description: string;
  readonly detail: string | null;
  readonly context: string | null;
  readonly range: readonly [number, number] | null;
  readonly severity: Exclude<Level, "info">;
}

export interface AgentDiagnostic {
  readonly line: number;
  readonly column: number;
  readonly rule: string;
  readonly message: string;
  readonly suggestion: string | null;
  readonly level: Level;
}

export interface AgnixOptions {
  readonly root: string;
  readonly disabled: readonly string[];
}

export interface NativeResult {
  readonly path: string;
  readonly diagnostics: readonly NativeDiagnostic[];
  readonly agentDiagnostics?: readonly AgentDiagnostic[] | null;
  readonly source?: Uint8Array | null;
}

export interface NativeOptions {
  readonly config?: Readonly<Record<string, unknown>>;
  readonly inlineConfig?: boolean;
  readonly keepTree?: boolean;
  readonly keepSource?: boolean;
  readonly traceparent?: string;
  readonly agnix?: AgnixOptions;
}

export interface SourceFile {
  readonly path: string;
  readonly text: string;
}

export interface Morpheme {
  readonly word_id: number;
  readonly word_type: "KNOWN" | "UNKNOWN";
  readonly surface_form: string;
  readonly pos: string;
  readonly pos_detail_1: string;
  readonly pos_detail_2: string;
  readonly pos_detail_3: string;
  readonly conjugated_type: string;
  readonly conjugated_form: string;
  readonly basic_form: string;
  readonly reading?: string;
  readonly pronunciation?: string;
  readonly word_position: number;
}

export interface Native {
  readonly lint: (files: readonly SourceFile[], options: NativeOptions) => readonly NativeResult[];
  readonly lintPaths: (
    root: string,
    paths: readonly string[],
    options: NativeOptions,
  ) => readonly NativeResult[];
  readonly flushTelemetry: () => Promise<void>;
  readonly readTexts: (root: string, paths: readonly string[]) => readonly (string | null)[];
  readonly tokenize: (text: string) => string;
}

const NATIVE_FUNCTIONS = ["lint", "lintPaths", "flushTelemetry", "readTexts", "tokenize"] as const;

const hasFunction =
  (value: unknown) =>
  (name: string): boolean =>
    Predicate.hasProperty(value, name) && Predicate.isFunction(value[name]);

const isNative = (value: unknown): value is Native =>
  pipe(NATIVE_FUNCTIONS, Arr.every(hasFunction(value)));

export const native: Effect.Effect<Native, Y8Error> = loadAddon({
  packageName: "@r_masseater/y8",
  binary: "y8",
  from: import.meta.url,
  isAddon: isNative,
  failWith: failedWith,
});
