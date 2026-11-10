import type { Location } from "@oxlint/plugins";
import { Option, String as Str, Record as Rec } from "effect";

import type { AstNode, Target } from "./types.ts";

const FIRST_LINE = 1;
const FIRST_COLUMN = 0;
const TARGET_NODE_TYPES = {
  function: ["FunctionDeclaration", "FunctionExpression", "ArrowFunctionExpression"],
  call: ["CallExpression"],
  jsx: ["JSXElement"],
  file: ["Program"],
} as const satisfies Readonly<Record<Target, readonly string[]>>;

const NAMED_PARENTS = {
  VariableDeclarator: "init",
  Property: "value",
  MethodDefinition: "value",
  PropertyDefinition: "value",
} as const;

type NamedField = (typeof NAMED_PARENTS)[keyof typeof NAMED_PARENTS];

const NAMED_PARENT_TYPES: ReadonlySet<string> = new Set(Rec.keys(NAMED_PARENTS));

const isNamedParentType = (type: string): type is keyof typeof NAMED_PARENTS =>
  NAMED_PARENT_TYPES.has(type);

const ANONYMOUS_FUNCTIONS: ReadonlySet<string> = new Set([
  "FunctionExpression",
  "ArrowFunctionExpression",
]);

const holdsAsName = (parent: AstNode, node: AstNode): boolean => {
  if (!isNamedParentType(parent.type)) {
    return false;
  }
  const field: NamedField = NAMED_PARENTS[parent.type];
  return ANONYMOUS_FUNCTIONS.has(node.type) && parent[field] === node;
};

const snippetNodeFor = (node: AstNode): AstNode =>
  Option.fromNullishOr(node.parent).pipe(
    Option.filter((parent) => holdsAsName(parent, node)),
    Option.getOrElse((): AstNode => node),
  );
const headOf = (text: string, line: number, column: number): Location => {
  const [first] = Str.split(text, "\n");
  return { start: { line, column }, end: { line, column: column + first.length } };
};

const REPORT_LOC = {
  function: (node: AstNode, text: string): Location =>
    headOf(text, node.loc.start.line, node.loc.start.column),
  call: (node: AstNode): Location => node.loc,
  jsx: (node: AstNode): Location =>
    Option.getOrElse(Option.fromNullishOr(node.openingElement), () => node).loc,
  file: (_node: AstNode, text: string): Location => headOf(text, FIRST_LINE, FIRST_COLUMN),
} as const satisfies Readonly<Record<Target, (node: AstNode, text: string) => Location>>;

export { REPORT_LOC, TARGET_NODE_TYPES, snippetNodeFor };
