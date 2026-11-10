import { Option, Predicate } from "effect";
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
import { declareSymbol } from "./binder-symbols.ts";
import type { BoundSymbol, SymbolTable } from "./binder-symbols.ts";
import { nameText } from "./binder-syntax.ts";
import { hasFlag } from "./flags.ts";

interface FileBinding {
  readonly file: SourceFile;
  readonly locals: SymbolTable;
  readonly isJs: boolean;
  readonly exportContext: boolean;
  readonly strict: boolean;
  readonly isExternalModule: boolean;
  symbol?: BoundSymbol;
  commonJsModuleIndicator?: Node;
}

interface Scope {
  readonly containerIsFile: boolean;
  readonly blockIsFile: boolean;
}

interface DeclarationTarget {
  readonly table: Option.Option<SymbolTable>;
  readonly parent: Option.Option<BoundSymbol>;
}

interface SymbolFlagPair {
  readonly includes: number;
  readonly excludes: number;
}

interface DeclareRequest {
  readonly target: DeclarationTarget;
  readonly node: Node;
  readonly flags: SymbolFlagPair;
}

const DEFAULT_NAME = "default";

const exportsOf = (owner: Option.Option<BoundSymbol>): DeclarationTarget => ({
  table: owner.pipe(Option.flatMap((symbol) => Option.fromNullishOr(symbol.exports))),
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

const declare = (binding: FileBinding, request: DeclareRequest): BoundSymbol => {
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
};

const declareLocal = (binding: FileBinding, node: Node, flags: SymbolFlagPair): BoundSymbol =>
  declare(binding, { target: fileLocals(binding), node, flags });

const declareExport = (binding: FileBinding, node: Node, flags: SymbolFlagPair): BoundSymbol =>
  declare(binding, { target: fileExports(binding), node, flags });

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
  local.exportSymbol = declareExport(binding, node, flags);
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

const declareSourceFileMember = (
  binding: FileBinding,
  node: Node,
  flags: SymbolFlagPair,
): BoundSymbol => {
  if (binding.isExternalModule) {
    return declareModuleMember(binding, node, flags);
  }
  return declareLocal(binding, node, flags);
};

const declareBlockScoped = (
  binding: FileBinding,
  node: Node,
  flags: SymbolFlagPair,
): BoundSymbol => {
  if (binding.isExternalModule || Predicate.isNotUndefined(binding.commonJsModuleIndicator)) {
    return declareModuleMember(binding, node, flags);
  }
  return declareLocal(binding, node, flags);
};

export { declare, declareBlockScoped, declareExport, declareSourceFileMember, exportsOf };
export type { DeclarationTarget, DeclareRequest, FileBinding, Scope, SymbolFlagPair };
