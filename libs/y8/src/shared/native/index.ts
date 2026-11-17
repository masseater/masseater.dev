import { createRequire } from "node:module";

import { Effect, Predicate } from "effect";

import { Y8Error, failedWith } from "#/shared/lib/errors.ts";

import { addonFile, platformTarget } from "./file.ts";

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

export interface NodeKind {
  readonly type: NodeType;
  readonly [field: string]: unknown;
}

export interface NativeNode {
  readonly kind: NodeKind;
  readonly start: number;
  readonly end: number;
  readonly parent: number | null;
  readonly children: readonly number[];
}

export interface NativeTree {
  readonly nodes: readonly NativeNode[];
}

export interface NativeDiagnostic {
  readonly line: number;
  readonly ruleNames: readonly string[];
  readonly description: string;
  readonly detail: string | null;
  readonly context: string | null;
  readonly range: readonly [number, number] | null;
  readonly severity: "error" | "warning";
}

export interface NativeResult {
  readonly path: string;
  readonly diagnostics: readonly NativeDiagnostic[];
  readonly tree?: NativeTree;
  readonly text?: string;
}

export interface NativeOptions {
  readonly config?: Readonly<Record<string, unknown>>;
  readonly inlineConfig?: boolean;
  readonly keepTree?: boolean;
  readonly keepText?: boolean;
  readonly traceparent?: string;
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
  readonly tokenize: (text: string) => string;
}

const isNative = (value: unknown): value is Native =>
  Predicate.hasProperty(value, "lint") &&
  Predicate.isFunction(value.lint) &&
  Predicate.hasProperty(value, "lintPaths") &&
  Predicate.isFunction(value.lintPaths) &&
  Predicate.hasProperty(value, "flushTelemetry") &&
  Predicate.isFunction(value.flushTelemetry) &&
  Predicate.hasProperty(value, "tokenize") &&
  Predicate.isFunction(value.tokenize);

const requireFrom = createRequire(import.meta.url);

const loadFrom = (specifier: string): Effect.Effect<unknown, Y8Error> =>
  Effect.try({
    try: (): unknown => requireFrom(specifier),
    catch: failedWith(`could not load ${specifier}`),
  });

const PACKAGE = "@r_masseater/y8";

export const native: Effect.Effect<Native, Y8Error> = loadFrom(`${PACKAGE}-${platformTarget}`).pipe(
  Effect.catchTag("Y8Error", () => loadFrom(`${PACKAGE}/native/${addonFile}`)),
  Effect.filterOrFail(isNative, () =>
    Y8Error.make({ message: `no y8 addon for ${platformTarget}` }),
  ),
);
