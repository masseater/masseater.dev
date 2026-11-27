import { Option, Predicate, Function as Fn } from "effect";
import { ModifierFlags } from "typescript/ast";
import type { Node, SourceFile } from "typescript/ast";
import {
  isExportSpecifier,
  isImportEqualsDeclaration,
  isJSDocCallbackTag,
  isJSDocTypedefTag,
} from "typescript/ast/is";
import { SymbolFlags } from "typescript/sync";

import {
  declarationName,
  hasExportModifier,
  hasSyntacticModifier,
  isAmbientModule,
} from "./binder-names.ts";
import { SymbolTable } from "./binder-symbol-table.ts";
import { declareSymbol } from "./binder-symbols.ts";
import type { BoundSymbol } from "./binder-symbols.ts";
import { nameText } from "./binder-syntax.ts";
import { hasFlag } from "./flags.ts";

const DATA_FIRST_ARITY = 2;
const DATA_FIRST_ARITY_3 = 3;

export interface FileFacts {
  readonly file: SourceFile;
  readonly isJs: boolean;
  readonly exportContext: boolean;
  readonly strict: boolean;
  readonly isExternalModule: boolean;
}

export class FileBinding implements FileFacts {
  public readonly file: SourceFile;

  public readonly locals = new SymbolTable();

  public readonly isJs: boolean;

  public readonly exportContext: boolean;

  public readonly strict: boolean;

  public readonly isExternalModule: boolean;

  #symbol: BoundSymbol | undefined;

  #commonJsModuleIndicator: Node | undefined;

  public constructor(facts: FileFacts) {
    this.file = facts.file;
    this.isJs = facts.isJs;
    this.exportContext = facts.exportContext;
    this.strict = facts.strict;
    this.isExternalModule = facts.isExternalModule;
  }

  public get symbol(): BoundSymbol | undefined {
    return this.#symbol;
  }

  public get commonJsModuleIndicator(): Node | undefined {
    return this.#commonJsModuleIndicator;
  }

  public readonly attach = (symbol: BoundSymbol): void => {
    this.#symbol = symbol;
  };

  public readonly markCommonJs = (node: Node): void => {
    this.#commonJsModuleIndicator = node;
  };
}

export interface Scope {
  readonly containerIsFile: boolean;
  readonly blockIsFile: boolean;
}

export interface DeclarationTarget {
  readonly table: Option.Option<SymbolTable>;
  readonly parent: Option.Option<BoundSymbol>;
}

export interface SymbolFlagPair {
  readonly includes: number;
  readonly excludes: number;
}

export interface DeclareRequest {
  readonly target: DeclarationTarget;
  readonly node: Node;
  readonly flags: SymbolFlagPair;
}

const DEFAULT_NAME = "default";

export const exportsOf = (owner: Option.Option<BoundSymbol>): DeclarationTarget => ({
  table: owner.pipe(Option.flatMap((symbol: BoundSymbol) => symbol.exportTable)),
  parent: owner,
});

const fileExports = (binding: FileBinding): DeclarationTarget =>
  exportsOf(Option.fromNullishOr(binding.symbol));

const fileLocals = (binding: FileBinding): DeclarationTarget => ({
  table: Option.some(binding.locals),
  parent: Option.none(),
});

const isExportSpecifierNamedDefault = (node: Node): boolean =>
  isExportSpecifier(node) && Option.contains(nameText(node.name), DEFAULT_NAME);

const isDefaultExport = (request: DeclareRequest): boolean =>
  Option.isSome(request.target.parent) &&
  (hasSyntacticModifier(request.node, ModifierFlags.Default) ||
    isExportSpecifierNamedDefault(request.node));

export const declare: {
  (request: DeclareRequest): (binding: FileBinding) => BoundSymbol;
  (binding: FileBinding, request: DeclareRequest): BoundSymbol;
} = Fn.dual(DATA_FIRST_ARITY, (binding: FileBinding, request: DeclareRequest): BoundSymbol => {
  const name = Option.orElse(
    Option.liftPredicate(DEFAULT_NAME, () => isDefaultExport(request)),
    () => declarationName(request.node, binding.isJs),
  );
  return declareSymbol({
    table: request.target.table,
    parent: request.target.parent,
    node: request.node,
    name,
    includes: request.flags.includes,
    excludes: request.flags.excludes,
  });
});

const declareLocal = (binding: FileBinding, node: Node, flags: SymbolFlagPair): BoundSymbol =>
  declare(binding, { target: fileLocals(binding), node, flags });

export const declareExport: {
  (node: Node, flags: SymbolFlagPair): (binding: FileBinding) => BoundSymbol;
  (binding: FileBinding, node: Node, flags: SymbolFlagPair): BoundSymbol;
} = Fn.dual(
  DATA_FIRST_ARITY_3,
  (binding: FileBinding, node: Node, flags: SymbolFlagPair): BoundSymbol =>
    declare(binding, { target: fileExports(binding), node, flags }),
);

const isJSDocTypeAliasWithName = (node: Node): boolean =>
  (isJSDocTypedefTag(node) || isJSDocCallbackTag(node)) && Predicate.isNotUndefined(node.name);

const isExportedMember = (node: Node): boolean =>
  hasExportModifier(node) || isJSDocTypeAliasWithName(node);

const declareAlias = (binding: FileBinding, node: Node, flags: SymbolFlagPair): BoundSymbol => {
  if (isExportSpecifier(node) || (isImportEqualsDeclaration(node) && isExportedMember(node))) {
    return declareExport(binding, node, flags);
  }
  return declareLocal(binding, node, flags);
};

const localExportFlags = (flags: SymbolFlagPair): SymbolFlagPair => ({
  includes: Number(hasFlag(flags.includes, SymbolFlags.Value)) * SymbolFlags.ExportValue,
  excludes: flags.excludes,
});

const declareExportedMember = (
  binding: FileBinding,
  node: Node,
  flags: SymbolFlagPair,
): BoundSymbol => {
  if (
    hasSyntacticModifier(node, ModifierFlags.Default) &&
    Option.isNone(declarationName(node, binding.isJs))
  ) {
    return declareExport(binding, node, flags);
  }
  const local = declareLocal(binding, node, localExportFlags(flags));
  local.exportThrough(declareExport(binding, node, flags));
  return local;
};

const isExportedDeclaration = (binding: FileBinding, node: Node): boolean =>
  !isAmbientModule(node) && (isExportedMember(node) || binding.exportContext);

const declareModuleMember = (
  binding: FileBinding,
  node: Node,
  flags: SymbolFlagPair,
): BoundSymbol => {
  if (hasFlag(flags.includes, SymbolFlags.Alias)) {
    return declareAlias(binding, node, flags);
  }
  if (isExportedDeclaration(binding, node)) {
    return declareExportedMember(binding, node, flags);
  }
  return declareLocal(binding, node, flags);
};

export const declareSourceFileMember: {
  (node: Node, flags: SymbolFlagPair): (binding: FileBinding) => BoundSymbol;
  (binding: FileBinding, node: Node, flags: SymbolFlagPair): BoundSymbol;
} = Fn.dual(
  DATA_FIRST_ARITY_3,
  (binding: FileBinding, node: Node, flags: SymbolFlagPair): BoundSymbol => {
    if (binding.isExternalModule) {
      return declareModuleMember(binding, node, flags);
    }
    return declareLocal(binding, node, flags);
  },
);

export const declareBlockScoped: {
  (node: Node, flags: SymbolFlagPair): (binding: FileBinding) => BoundSymbol;
  (binding: FileBinding, node: Node, flags: SymbolFlagPair): BoundSymbol;
} = Fn.dual(
  DATA_FIRST_ARITY_3,
  (binding: FileBinding, node: Node, flags: SymbolFlagPair): BoundSymbol => {
    if (binding.isExternalModule || Predicate.isNotUndefined(binding.commonJsModuleIndicator)) {
      return declareModuleMember(binding, node, flags);
    }
    return declareLocal(binding, node, flags);
  },
);
