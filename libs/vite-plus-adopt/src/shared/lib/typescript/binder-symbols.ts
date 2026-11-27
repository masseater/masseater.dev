import { Option, Predicate, String as Str, Function as Fn } from "effect";
import { NodeFlags, ScriptKind, SyntaxKind } from "typescript/ast";
import type { Node } from "typescript/ast";
import { isSourceFile } from "typescript/ast/is";
import { SymbolFlags } from "typescript/sync";

import { SymbolTable } from "./binder-symbol-table.ts";
import { EMPTY, combineFlags, hasFlag, withFlags } from "./flags.ts";

const DATA_FIRST_ARITY = 2;

export interface SymbolDeclaration {
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

export const unescapeLeadingUnderscores = (name: string): string => {
  if (Str.startsWith(TRIPLE_UNDERSCORE)(name)) {
    return Str.slice(UNDERSCORE.length)(name);
  }
  return name;
};

export const escapeLeadingUnderscores = (name: string): string => {
  if (Str.startsWith(DOUBLE_UNDERSCORE)(name)) {
    return `${UNDERSCORE}${name}`;
  }
  return name;
};

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

const EXPORT_TABLE_FLAGS = combineFlags(
  SymbolFlags.Class,
  SymbolFlags.Enum,
  SymbolFlags.Module,
  SymbolFlags.Variable,
);

const entriesOf = (table: SymbolTable): ReadonlyMap<string, BoundSymbol> => table.entries;

export class BoundSymbol {
  public readonly escapedName: string;

  public readonly name: string;

  #flags: number;

  #declarations: readonly Node[] | undefined;

  #valueDeclaration: Node | undefined;

  #exports: Option.Option<SymbolTable> = Option.none();

  #parent: BoundSymbol | undefined;

  #exportSymbol: BoundSymbol | undefined;

  public constructor(flags: number, escapedName: string) {
    this.#flags = flags;
    this.escapedName = escapedName;
    this.name = unescapeLeadingUnderscores(escapedName);
  }

  public get flags(): number {
    return this.#flags;
  }

  public get declarations(): readonly Node[] | undefined {
    return this.#declarations;
  }

  public get valueDeclaration(): Node | undefined {
    return this.#valueDeclaration;
  }

  public get exports(): ReadonlyMap<string, BoundSymbol> | undefined {
    return this.#exports.pipe(Option.map(entriesOf), Option.getOrUndefined);
  }

  public get parent(): BoundSymbol | undefined {
    return this.#parent;
  }

  public get exportSymbol(): BoundSymbol | undefined {
    return this.#exportSymbol;
  }

  public get exportTable(): Option.Option<SymbolTable> {
    return this.#exports;
  }

  public readonly openExports = (): void => {
    this.#exports = Option.orElseSome(this.#exports, () => new SymbolTable());
  };

  public readonly setValueDeclaration = (node: Node): void => {
    const existing = this.#valueDeclaration;
    if (Predicate.isUndefined(existing) || replacesValueDeclaration(existing, node)) {
      this.#valueDeclaration = node;
    }
  };

  public readonly addDeclaration = (node: Node, flags: number): void => {
    this.#flags = withFlags(this.#flags, flags);
    const declarations = this.#declarations ?? [];
    if (!declarations.includes(node)) {
      this.#declarations = [...declarations, node];
    }
    if (hasFlag(flags, EXPORT_TABLE_FLAGS)) {
      this.openExports();
    }
    if (hasFlag(flags, SymbolFlags.Value)) {
      this.setValueDeclaration(node);
    }
  };

  public readonly adoptedBy = (parent: BoundSymbol): void => {
    this.#parent ??= parent;
  };

  public readonly exportThrough = (symbol: BoundSymbol): void => {
    this.#exportSymbol = symbol;
  };
}

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
  const found = table.entries.get(name);
  if (Predicate.isUndefined(found)) {
    const created = new BoundSymbol(EMPTY, name);
    table.add(created);
    return created;
  }
  if (conflicts(found, declaration)) {
    return new BoundSymbol(EMPTY, name);
  }
  return found;
};

export const exportOf: {
  (name: string): (owner: BoundSymbol) => Option.Option<BoundSymbol>;
  (owner: BoundSymbol, name: string): Option.Option<BoundSymbol>;
} = Fn.dual(DATA_FIRST_ARITY, (owner: BoundSymbol, name: string): Option.Option<BoundSymbol> =>
  Option.flatMap(Option.fromNullishOr(owner.exports), (table) =>
    Option.fromNullishOr(table.get(name)),
  ),
);

export const declareSymbol = (declaration: SymbolDeclaration): BoundSymbol => {
  const symbol: BoundSymbol = Option.getOrElse(
    Option.zipWith(declaration.table, declaration.name, (table, name) =>
      symbolInTable(table, name, declaration),
    ),
    () => new BoundSymbol(EMPTY, MISSING_NAME),
  );
  symbol.addDeclaration(declaration.node, declaration.includes);
  if (Option.isSome(declaration.parent)) {
    symbol.adoptedBy(declaration.parent.value);
  }
  return symbol;
};
