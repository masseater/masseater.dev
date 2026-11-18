import { Array as Arr, Option, String as Str, pipe } from "effect";

import type {
  ParseError,
  Position,
  Source,
  SyntaxNode,
  YamlKind,
  YamlNode,
  YamlStyle,
} from "#/shared/config/index.ts";
import { CONCRETE, FLAG, NONE, SEMANTIC } from "#/shared/native/index.ts";
import type { SourceView } from "#/shared/native/index.ts";

const FIRST = 1;
const FIRST_LINE = 0;
const HALF = 2;
const BIT = 2;
const SET = 1;
const ERROR_FIELD = { line: 0, column: 1, message: 2 } as const;
const LINE_BREAK = /\r\n|\r|\n/u;
const NEWLINES = /\n/gu;

const KINDS: readonly YamlKind[] = ["scalar", "sequence", "mapping", "alias"];
const STYLES: readonly YamlStyle[] = [
  "plain",
  "single-quoted",
  "double-quoted",
  "literal",
  "folded",
];

const pick = <Value>(values: readonly Value[], index: number, fallback: Value): Value =>
  pipe(
    Arr.get(values, index),
    Option.getOrElse(() => fallback),
  );

const lazy = <Value>(make: () => Value): (() => Value) => {
  let made: Option.Option<Value> = Option.none();
  return () =>
    pipe(
      made,
      Option.getOrElse(() => {
        const value = make();
        made = Option.some(value);
        return value;
      }),
    );
};

const memo = <Node>(make: (id: number) => Node): ((id: number) => Node) => {
  const made = new Map<number, Node>();
  return (id) => made.getOrInsertComputed(id, () => make(id));
};

const times = <Value>(count: number, make: (index: number) => Value): readonly Value[] =>
  Array.from({ length: count }, (_empty, index) => make(index));

const childrenOf =
  <Node>(view: SourceView, at: (id: number) => Node) =>
  (start: number, count: number): readonly Node[] =>
    times(count, (offset) => at(view.child(start + offset)));

const yamlTree = (view: SourceView): ((id: number) => YamlNode) => {
  const at: (id: number) => YamlNode = memo((id) => {
    const field = (name: keyof typeof SEMANTIC): number => view.semantic(id, SEMANTIC[name]);
    const children = lazy(() => childrenOf(view, at)(field("childStart"), field("childCount")));
    return {
      id,
      kind: pick(KINDS, field("kind"), "scalar"),
      tag: view.stringAt(field("tag")),
      value: view.stringAt(field("value")),
      style: pick(STYLES, field("style"), "plain"),
      line: field("line"),
      column: field("column"),
      get children(): readonly YamlNode[] {
        return children();
      },
    };
  });
  return at;
};

const hasFlag = (flags: number, flag: number): boolean => Math.floor(flags / flag) % BIT === SET;

const present = (index: number): Option.Option<number> =>
  Option.liftPredicate(index, (value) => value !== NONE);

const syntaxNode =
  (view: SourceView, at: (id: number) => SyntaxNode) =>
  (id: number): SyntaxNode => {
    const field = (name: keyof typeof CONCRETE): number => view.concrete(id, CONCRETE[name]);
    const flags = field("flags");
    const start = field("start");
    const end = field("end");
    const children = lazy(() => childrenOf(view, at)(field("childStart"), field("childCount")));
    return {
      id,
      type: view.stringAt(field("kind")),
      named: hasFlag(flags, FLAG.named),
      isError: hasFlag(flags, FLAG.error),
      isMissing: hasFlag(flags, FLAG.missing),
      isExtra: hasFlag(flags, FLAG.extra),
      start,
      end,
      field: pipe(present(field("field")), Option.map(view.stringAt), Option.getOrUndefined),
      get parent(): SyntaxNode | undefined {
        return pipe(present(field("parent")), Option.map(at), Option.getOrUndefined);
      },
      get children(): readonly SyntaxNode[] {
        return children();
      },
      get namedChildren(): readonly SyntaxNode[] {
        return pipe(
          children(),
          Arr.filter((child) => child.named),
        );
      },
      get text(): string {
        return Str.slice(start, end)(view.text);
      },
    };
  };

const syntaxTree = (view: SourceView): ((id: number) => SyntaxNode) => {
  const at: (id: number) => SyntaxNode = memo((id) => syntaxNode(view, at)(id));
  return at;
};

const lineStartsOf = (text: string): readonly number[] => [
  FIRST_LINE,
  ...Array.from(Str.matchAll(NEWLINES)(text), (match) => (match.index ?? FIRST_LINE) + FIRST),
];

const lineAt = (starts: readonly number[], offset: number): number => {
  let low = FIRST_LINE;
  let high = starts.length - FIRST;
  while (low < high) {
    const middle = Math.ceil((low + high) / HALF);
    if ((starts[middle] ?? FIRST_LINE) <= offset) {
      low = middle;
    } else {
      high = middle - FIRST;
    }
  }
  return low;
};

const positionIn = (text: string): ((offset: number) => Position) => {
  const starts = lineStartsOf(text);
  return (offset) => {
    const line = lineAt(starts, offset);
    return { line: line + FIRST, column: offset - (starts[line] ?? FIRST_LINE) + FIRST };
  };
};

const errorsOf = (view: SourceView): readonly ParseError[] =>
  times(view.errorCount, (index) => ({
    line: view.error(index, ERROR_FIELD.line),
    column: view.error(index, ERROR_FIELD.column),
    message: view.stringAt(view.error(index, ERROR_FIELD.message)),
  }));

export const sourceOf = (view: SourceView): Source => {
  const yaml = yamlTree(view);
  const syntax = syntaxTree(view);
  const lines = lazy(() => Str.split(LINE_BREAK)(view.text));
  return {
    text: view.text,
    yaml: pipe(view.semanticRoot, Option.map(yaml), Option.getOrUndefined),
    syntax: pipe(view.concreteRoot, Option.map(syntax), Option.getOrUndefined),
    errors: errorsOf(view),
    get lines(): readonly string[] {
      return lines();
    },
    positionOf: positionIn(view.text),
  };
};
