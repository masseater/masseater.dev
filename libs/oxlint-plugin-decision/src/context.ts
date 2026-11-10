import type { Context } from "@oxlint/plugins";
import { Array as Arr, Option, Predicate, String as Str, pipe, Function as Fn } from "effect";

import { sourceLines } from "./location.ts";
import { snippetNodeFor } from "./nodes.ts";
import type { AstNode, EnclosingKind, ResolvedRule, RuleContext } from "./types.ts";

const DATA_FIRST_ARITY_3 = 3;

const DEFAULT_LINES = 5;
const FIRST_LINE = 1;
const LAST = 1;
const END = 1;

const ENCLOSING_TYPES: Readonly<Record<EnclosingKind, readonly string[]>> = {
  function: ["FunctionDeclaration", "FunctionExpression", "ArrowFunctionExpression"],
  class: ["ClassDeclaration", "ClassExpression"],
  block: ["BlockStatement", "StaticBlock", "Program"],
};

const ancestorsOf = (node: AstNode): readonly AstNode[] =>
  Arr.unfold(Option.fromNullishOr(node.parent), (current) =>
    current.pipe(
      Option.map((ancestor) => [ancestor, Option.fromNullishOr(ancestor.parent)] as const),
    ),
  );

const enclosingText = (context: Context, node: AstNode, kind: EnclosingKind): string =>
  Arr.findFirst(ancestorsOf(node), (ancestor) =>
    ENCLOSING_TYPES[kind].includes(ancestor.type),
  ).pipe(
    Option.match({
      onNone: () => context.sourceCode.text,
      onSome: (ancestor) => context.sourceCode.getText(ancestor),
    }),
  );

const linesAround = (
  context: Context,
  node: AstNode,
  {
    before = DEFAULT_LINES,
    after = DEFAULT_LINES,
  }: { readonly before?: number; readonly after?: number },
): string => {
  const lines = sourceLines(context.sourceCode.text);
  const first = Math.max(FIRST_LINE, node.loc.start.line - before);
  const last = Math.min(lines.length, node.loc.end.line + after);
  return pipe(
    lines,
    Arr.drop(first - FIRST_LINE),
    Arr.take(last - first + FIRST_LINE),
    Arr.map((text, index) => `L${String(first + index)}| ${text}`),
    Arr.join("\n"),
  );
};

const DECLARING_PARENTS: ReadonlySet<string> = new Set([
  "VariableDeclaration",
  "ExportNamedDeclaration",
  "ExportDefaultDeclaration",
]);

const declarationOf = (node: AstNode): AstNode =>
  Option.fromNullishOr(node.parent).pipe(
    Option.filter((parent) => DECLARING_PARENTS.has(parent.type)),
    Option.match({ onNone: () => node, onSome: declarationOf }),
  );

interface Span {
  readonly start: number;
  readonly end: number;
}

const leadingOf = (text: string, comments: readonly Span[], until: number): readonly Span[] =>
  Option.match(Arr.last(comments), {
    onNone: () => [],
    onSome: (last) => {
      if (Str.isNonEmpty(Str.trim(Str.slice(last.end, until)(text)))) {
        return [];
      }
      return [...leadingOf(text, Arr.dropRight(comments, LAST), last.start), last];
    },
  });

const commentedTextOf = (context: Context, node: AstNode): Option.Option<string> => {
  const { text } = context.sourceCode;
  const named = snippetNodeFor(node);
  const [start] = declarationOf(named).range;
  const before = pipe(
    context.sourceCode.getAllComments(),
    Arr.filter((comment) => comment.type !== "Shebang" && comment.end <= start),
  );
  return Arr.match(leadingOf(text, before, start), {
    onEmpty: () => Option.none(),
    onNonEmpty: ([first]) => Option.some(Str.slice(first.start, named.range[END])(text)),
  });
};

const isCommented = ({ context: wanted }: ResolvedRule): boolean =>
  Predicate.isNotUndefined(wanted) && wanted.scope === "comment";

const commentedSnippetOf: {
  (node: AstNode, rule: ResolvedRule): (context: Context) => Option.Option<string>;
  (context: Context, node: AstNode, rule: ResolvedRule): Option.Option<string>;
} = Fn.dual(
  DATA_FIRST_ARITY_3,
  (context: Context, node: AstNode, rule: ResolvedRule): Option.Option<string> =>
    Option.flatMap(Option.liftPredicate(rule, isCommented), () => commentedTextOf(context, node)),
);

const lacksComment: {
  (node: AstNode, rule: ResolvedRule): (context: Context) => boolean;
  (context: Context, node: AstNode, rule: ResolvedRule): boolean;
} = Fn.dual(
  DATA_FIRST_ARITY_3,
  (context: Context, node: AstNode, rule: ResolvedRule): boolean =>
    isCommented(rule) && Option.isNone(commentedTextOf(context, node)),
);

const contextOf: {
  (node: AstNode, rule: RuleContext): (context: Context) => Option.Option<string>;
  (context: Context, node: AstNode, rule: RuleContext): Option.Option<string>;
} = Fn.dual(
  DATA_FIRST_ARITY_3,
  (context: Context, node: AstNode, rule: RuleContext): Option.Option<string> => {
    if (rule.scope === "lines") {
      return Option.some(linesAround(context, node, rule));
    }
    if (rule.scope === "enclosing") {
      return Option.some(enclosingText(context, node, rule.kind));
    }
    return Option.liftPredicate(context.sourceCode.text, () => rule.scope === "file");
  },
);

export { commentedSnippetOf, contextOf, lacksComment };
