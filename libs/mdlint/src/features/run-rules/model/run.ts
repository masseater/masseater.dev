import { Array as Arr, Option, String as Str, pipe } from "effect";

import { reportedSeverity } from "#/entities/rule/index.ts";
import type { ScriptRule } from "#/entities/rule/index.ts";
import type { Diagnostic, MarkdownNode, Report, Visitors } from "#/shared/config/index.ts";
import { present } from "#/shared/lib/present.ts";
import type { NativeTree } from "#/shared/native/index.ts";

import { documentOf } from "./document.ts";
import type { Document } from "./document.ts";

const EXIT = ":exit";
const FIRST_LINE = 1;
const LINE_BREAK = /\r\n|\r|\n/u;

export interface ScriptInput {
  readonly path: string;
  readonly text: string;
  readonly tree: NativeTree;
  readonly rules: readonly ScriptRule[];
}

type Handler = (node: MarkdownNode) => void;

const handlerOf = (visitor: Visitors, key: keyof Visitors): Option.Option<Handler> =>
  Option.fromNullishOr(visitor[key]);

const visit = (visitors: readonly Visitors[], key: keyof Visitors, node: MarkdownNode): void => {
  for (const visitor of visitors) {
    for (const handler of Option.toArray(handlerOf(visitor, key))) {
      handler(node);
    }
  }
};

const walk = (visitors: readonly Visitors[], node: MarkdownNode): void => {
  visit(visitors, node.type, node);
  for (const child of node.children) {
    walk(visitors, child);
  }
  visit(visitors, `${node.type}${EXIT}`, node);
};

type Extras = Partial<{
  readonly column: number;
  readonly length: number;
  readonly detail: string;
}>;

const extras = (report: Report, position: Option.Option<{ readonly column: number }>): Extras => ({
  ...present(
    pipe(
      Option.fromNullishOr(report.column),
      Option.orElse(() =>
        pipe(
          position,
          Option.map(({ column }) => column),
        ),
      ),
    ),
    (column) => ({ column }),
  ),
  ...present(Option.fromNullishOr(report.length), (length) => ({ length })),
  ...present(Option.fromNullishOr(report.detail), (detail) => ({ detail })),
});

const diagnosticOf =
  (path: string, document: Document, rule: ScriptRule) =>
  (report: Report): Diagnostic => {
    const position = pipe(
      Option.fromNullishOr(report.node),
      Option.map((node) => document.positionOf(node.start)),
    );
    const line = pipe(
      Option.fromNullishOr(report.line),
      Option.orElse(() =>
        pipe(
          position,
          Option.map(({ line: at }) => at),
        ),
      ),
      Option.getOrElse(() => FIRST_LINE),
    );
    return {
      path,
      line,
      rule: rule.id,
      message: report.message,
      severity: reportedSeverity(rule.setting),
      ...extras(report, position),
    };
  };

const runOn = (input: ScriptInput, document: Document): readonly Diagnostic[] => {
  const found: Diagnostic[] = [];
  const lines = Str.split(input.text, LINE_BREAK);
  const visitors = pipe(
    input.rules,
    Arr.map((rule) => {
      const toDiagnostic = diagnosticOf(input.path, document, rule);
      return rule.rule.create({
        filename: input.path,
        text: input.text,
        lines,
        options: rule.setting.options,
        root: document.root,
        textOf: document.textOf,
        positionOf: document.positionOf,
        report: (report) => {
          found.push(toDiagnostic(report));
        },
      });
    }),
  );
  walk(visitors, document.root);
  return found;
};

export const runScriptRules = (input: ScriptInput): readonly Diagnostic[] =>
  pipe(
    documentOf(input),
    Option.filter(() => Arr.isReadonlyArrayNonEmpty(input.rules)),
    Option.map((document) => runOn(input, document)),
    Option.getOrElse((): readonly Diagnostic[] => []),
  );
