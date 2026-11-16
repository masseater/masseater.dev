import { createRequire } from "node:module";

import { Predicate } from "effect";

import { addonFile } from "./file.ts";

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

export interface Native {
  readonly lint: (files: readonly SourceFile[], options: NativeOptions) => readonly NativeResult[];
  readonly lintPaths: (
    root: string,
    paths: readonly string[],
    options: NativeOptions,
  ) => readonly NativeResult[];
  readonly flushTelemetry: () => Promise<void>;
}

const isNative = (value: unknown): value is Native =>
  Predicate.hasProperty(value, "lint") &&
  Predicate.isFunction(value.lint) &&
  Predicate.hasProperty(value, "lintPaths") &&
  Predicate.isFunction(value.lintPaths) &&
  Predicate.hasProperty(value, "flushTelemetry") &&
  Predicate.isFunction(value.flushTelemetry);

const load = (): Native => {
  const loaded: unknown = createRequire(import.meta.url)(`../../../native/${addonFile}`);
  if (!isNative(loaded)) {
    throw new TypeError(`mdlint: native/${addonFile} is not the mdlint addon`);
  }
  return loaded;
};

export const native = load();
