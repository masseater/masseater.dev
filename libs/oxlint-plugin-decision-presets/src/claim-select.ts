import type { SelectedNode } from "@r_masseater/oxlint-plugin-decision";
import { Array as Arr, Match, Option, Predicate, String as Str, pipe } from "effect";

import { containing, dualSelect, identifierOf, ofType } from "./select.ts";
import type { DualSelect, NodeTest, Select } from "./select.ts";

const WORD_STARTS: ReadonlySet<string> = new Set([
  "",
  ...Str.split("_0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", ""),
]);

const NEXT_CHARACTER = 1;

const startsWithWord =
  (word: string): Predicate.Predicate<string> =>
  (name) =>
    Predicate.and(
      (text: string) => Str.startsWith(word)(text),
      (text: string) => WORD_STARTS.has(Str.slice(word.length, word.length + NEXT_CHARACTER)(text)),
    )(name);

const endsWith =
  (word: string): Predicate.Predicate<string> =>
  (name) =>
    Str.endsWith(word)(name);

interface NameWords {
  readonly prefixes: readonly string[];
  readonly suffixes?: readonly string[];
}

const namedLike = ({ prefixes, suffixes = [] }: NameWords): Select => {
  const matchers = [
    ...pipe(
      prefixes,
      Arr.map((word) => startsWithWord(word)),
    ),
    ...pipe(
      suffixes,
      Arr.map((word) => endsWith(word)),
    ),
  ];
  return (_node, { name }) =>
    Option.exists(Option.fromUndefinedOr(name), (found) =>
      pipe(
        matchers,
        Arr.some((matches) => matches(found)),
      ),
    );
};

const rootOf = (callee: SelectedNode): Option.Option<string> =>
  Match.value(callee).pipe(
    Match.when({ type: "MemberExpression", computed: false }, (member) => rootOf(member.object)),
    Match.orElse(identifierOf),
  );

const calleeOf = (node: SelectedNode): Option.Option<SelectedNode> =>
  Match.value(node).pipe(
    Match.when({ type: "CallExpression" }, (call) => Option.some(call.callee)),
    Match.orElse(() => Option.none()),
  );

const callingAny =
  (roots: readonly string[]): Select =>
  (node) =>
    Option.exists(Option.flatMap(calleeOf(node), rootOf), (root) => roots.includes(root));

const LOG_LEVELS: ReadonlySet<string> = new Set([
  "trace",
  "debug",
  "verbose",
  "info",
  "log",
  "warn",
  "warning",
  "error",
  "fatal",
]);

const lastNameOf = (node: SelectedNode): Option.Option<string> =>
  Match.value(node).pipe(
    Match.when({ type: "MemberExpression", computed: false }, (member) =>
      identifierOf(member.property),
    ),
    Match.orElse(identifierOf),
  );

const isLogger = (name: string): boolean =>
  Arr.some(["console", "log"], (word) => Str.includes(word)(Str.toLowerCase(name)));

interface LogCall {
  readonly level: Option.Option<string>;
  readonly logger: Option.Option<string>;
}

const logCallOf = (callee: SelectedNode): Option.Option<LogCall> =>
  Match.value(callee).pipe(
    Match.when({ type: "MemberExpression", computed: false }, (member) =>
      Option.some({ level: identifierOf(member.property), logger: lastNameOf(member.object) }),
    ),
    Match.orElse(() => Option.none()),
  );

const isLogCall: DualSelect = dualSelect((node) =>
  Option.exists(Option.flatMap(calleeOf(node), logCallOf), ({ level, logger }) =>
    Predicate.and(
      () => Option.exists(level, (found) => LOG_LEVELS.has(found)),
      () => Option.exists(logger, isLogger),
    )(node),
  ),
);

const isCatchName = (name: SelectedNode): boolean =>
  Match.value(name).pipe(
    Match.when({ type: "Identifier" }, (identifier) => Str.startsWith("catch")(identifier.name)),
    Match.orElse(() => false),
  );

const isCatch: NodeTest = (node) =>
  Match.value(node).pipe(
    Match.when({ type: "CatchClause" }, () => true),
    Match.when({ type: "MemberExpression", computed: false }, (member) =>
      isCatchName(member.property),
    ),
    Match.when({ type: "Property", computed: false }, (property) => isCatchName(property.key)),
    Match.orElse(() => false),
  );

const hasCatch: DualSelect = dualSelect(containing(isCatch));

const hasCallbackArgument: Select = (node) =>
  Match.value(node).pipe(
    Match.when({ type: "CallExpression" }, (call) =>
      pipe(
        call.arguments,
        Arr.some((argument) => ofType("ArrowFunctionExpression", "FunctionExpression")(argument)),
      ),
    ),
    Match.orElse(() => false),
  );

const isTestCall: DualSelect = dualSelect((node, match) =>
  pipe(
    [callingAny(["it", "test"]), hasCallbackArgument],
    Arr.every((select) => select(node, match)),
  ),
);

const isDescribeCall: DualSelect = dualSelect(callingAny(["describe"]));

export { hasCatch, isDescribeCall, isLogCall, isTestCall, namedLike };
export type { NameWords };
