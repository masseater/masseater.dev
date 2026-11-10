import { Option, Predicate } from "effect";
import { NodeFlags, ScriptKind, SyntaxKind } from "typescript/ast";
import type { Node } from "typescript/ast";
import { isSourceFile } from "typescript/ast/is";
import { SymbolFlags } from "typescript/sync";

import { EMPTY, combineFlags, hasFlag, withFlags } from "./flags.ts";

interface BoundSymbol {
  flags: number;
  readonly escapedName: string;
  readonly name: string;
  declarations?: Node[];
  valueDeclaration?: Node;
  exports?: SymbolTable;
  members?: SymbolTable;
  parent?: BoundSymbol;
  exportSymbol?: BoundSymbol;
}

interface SymbolTable extends Map<string, BoundSymbol> {}

interface SymbolDeclaration {
  readonly table: Option.Option<SymbolTable>;
  readonly parent: Option.Option<BoundSymbol>;
  readonly node: Node;
  readonly name: Option.Option<string>;
  readonly includes: number;
  readonly excludes: number;
}

const UNDERSCORE = "_";
const DOUBLE_UNDERSCORE = "__";
const TRIPLE_UNDERSCORE = "___";
const MISSING_NAME = "__missing";

const unescapeLeadingUnderscores = (name: string): string => {
  if (name.startsWith(TRIPLE_UNDERSCORE)) {
    return name.slice(UNDERSCORE.length);
  }
  return name;
};

const escapeLeadingUnderscores = (name: string): string => {
  if (name.startsWith(DOUBLE_UNDERSCORE)) {
    return `${UNDERSCORE}${name}`;
  }
  return name;
};

const createSymbol = (flags: number, escapedName: string): BoundSymbol => ({
  flags,
  escapedName,
  name: unescapeLeadingUnderscores(escapedName),
});

const isInJsFileNode = (node: Node): boolean => {
  let current = node;
  while (!isSourceFile(current)) {
    current = current.parent;
  }
  return current.scriptKind === ScriptKind.JS || current.scriptKind === ScriptKind.JSX;
};

const isAmbientNode = (node: Node): boolean => hasFlag(node.flags, NodeFlags.Ambient);

const ASSIGNMENT_DECLARATION_KINDS: ReadonlySet<SyntaxKind> = new Set([
  SyntaxKind.BinaryExpression,
  SyntaxKind.PropertyAccessExpression,
  SyntaxKind.ElementAccessExpression,
  SyntaxKind.Identifier,
  SyntaxKind.CallExpression,
]);

const isAssignmentDeclarationNode = (node: Node): boolean =>
  ASSIGNMENT_DECLARATION_KINDS.has(node.kind);

const isEffectiveModuleDeclaration = (node: Node): boolean =>
  node.kind === SyntaxKind.ModuleDeclaration || node.kind === SyntaxKind.Identifier;

const isAmbientOverride = (existing: Node, node: Node): boolean =>
  isAmbientNode(node) && !isInJsFileNode(node) && !isAmbientNode(existing);

const replacesAssignmentDeclaration = (existing: Node, node: Node): boolean =>
  !isAmbientOverride(existing, node) &&
  isAssignmentDeclarationNode(existing) &&
  !isAssignmentDeclarationNode(node);

const replacesModuleDeclaration = (existing: Node, node: Node): boolean =>
  existing.kind !== node.kind && isEffectiveModuleDeclaration(existing);

const replacesValueDeclaration = (existing: Node, node: Node): boolean =>
  replacesAssignmentDeclaration(existing, node) || replacesModuleDeclaration(existing, node);

const setValueDeclaration = (symbol: BoundSymbol, node: Node): void => {
  const existing = symbol.valueDeclaration;
  if (Predicate.isUndefined(existing) || replacesValueDeclaration(existing, node)) {
    symbol.valueDeclaration = node;
  }
};

const EXPORT_TABLE_FLAGS = combineFlags(
  SymbolFlags.Class,
  SymbolFlags.Enum,
  SymbolFlags.Module,
  SymbolFlags.Variable,
);

const MEMBER_TABLE_FLAGS = combineFlags(
  SymbolFlags.Class,
  SymbolFlags.Interface,
  SymbolFlags.TypeLiteral,
  SymbolFlags.ObjectLiteral,
);

const recordDeclaration = (symbol: BoundSymbol, node: Node): void => {
  const declarations = symbol.declarations ?? [];
  if (!declarations.includes(node)) {
    declarations.push(node);
  }
  symbol.declarations = declarations;
};

const DECLARATION_EFFECTS: readonly (readonly [
  required: number,
  apply: (symbol: BoundSymbol, node: Node) => void,
])[] = [
  [
    EXPORT_TABLE_FLAGS,
    (symbol) => {
      symbol.exports ??= new Map();
    },
  ],
  [
    MEMBER_TABLE_FLAGS,
    (symbol) => {
      symbol.members ??= new Map();
    },
  ],
  [SymbolFlags.Value, setValueDeclaration],
];

const addDeclarationToSymbol = (symbol: BoundSymbol, node: Node, flags: number): void => {
  symbol.flags = withFlags(symbol.flags, flags);
  recordDeclaration(symbol, node);
  for (const [required, apply] of DECLARATION_EFFECTS) {
    if (hasFlag(flags, required)) {
      apply(symbol, node);
    }
  }
};

const conflicts = (found: BoundSymbol, declaration: SymbolDeclaration): boolean =>
  hasFlag(found.flags, declaration.excludes) &&
  !(
    hasFlag(declaration.includes, SymbolFlags.Variable) &&
    hasFlag(found.flags, SymbolFlags.Assignment)
  );

const symbolInTable = (
  table: SymbolTable,
  name: string,
  declaration: SymbolDeclaration,
): BoundSymbol => {
  const found = table.get(name);
  if (Predicate.isUndefined(found)) {
    const created = createSymbol(EMPTY, name);
    table.set(name, created);
    return created;
  }
  if (conflicts(found, declaration)) {
    return createSymbol(EMPTY, name);
  }
  return found;
};

const exportOf = (owner: BoundSymbol, name: string): Option.Option<BoundSymbol> =>
  Option.flatMap(Option.fromNullishOr(owner.exports), (table) =>
    Option.fromNullishOr(table.get(name)),
  );

const declareSymbol = (declaration: SymbolDeclaration): BoundSymbol => {
  const symbol = Option.getOrElse(
    Option.zipWith(declaration.table, declaration.name, (table, name) =>
      symbolInTable(table, name, declaration),
    ),
    () => createSymbol(EMPTY, MISSING_NAME),
  );
  addDeclarationToSymbol(symbol, declaration.node, declaration.includes);
  if (Predicate.isUndefined(symbol.parent) && Option.isSome(declaration.parent)) {
    symbol.parent = declaration.parent.value;
  }
  return symbol;
};

export {
  addDeclarationToSymbol,
  createSymbol,
  declareSymbol,
  escapeLeadingUnderscores,
  exportOf,
  setValueDeclaration,
  unescapeLeadingUnderscores,
};
export type { BoundSymbol, SymbolDeclaration, SymbolTable };
