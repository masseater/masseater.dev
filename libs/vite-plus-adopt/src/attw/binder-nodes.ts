import { Option, Predicate } from "effect";
import { SyntaxKind } from "typescript/ast";
import type { ExportDeclaration, Node } from "typescript/ast";
import {
  isExportAssignment,
  isExportDeclaration,
  isImportClause,
  isModuleDeclaration,
  isNamespaceExport,
  isSourceFile,
} from "typescript/ast/is";
import { SymbolFlags } from "typescript/sync";

import {
  declareBlockScoped,
  declareExport,
  declareSourceFileMember,
} from "./binder-declarations.ts";
import type { FileBinding, Scope, SymbolFlagPair } from "./binder-declarations.ts";
import { NON_INSTANTIATED, getModuleInstanceState, isConstEnum } from "./binder-module-state.ts";
import { isAmbientModule } from "./binder-names.ts";
import { setValueDeclaration } from "./binder-symbols.ts";
import { isAliasableExpression } from "./binder-syntax.ts";
import { EMPTY } from "./flags.ts";

type NodeBinder = (binding: FileBinding, node: Node, scope: Scope) => void;

const flagPair = (includes: number, excludes: number): SymbolFlagPair => ({ includes, excludes });

const ALIAS = flagPair(SymbolFlags.Alias, SymbolFlags.AliasExcludes);
const FUNCTION = flagPair(SymbolFlags.Function, SymbolFlags.FunctionExcludes);
const VALUE_MODULE = flagPair(SymbolFlags.ValueModule, SymbolFlags.ValueModuleExcludes);
const NAMESPACE_MODULE = flagPair(SymbolFlags.NamespaceModule, SymbolFlags.NamespaceModuleExcludes);
const CONST_ENUM = flagPair(SymbolFlags.ConstEnum, SymbolFlags.ConstEnumExcludes);
const REGULAR_ENUM = flagPair(SymbolFlags.RegularEnum, SymbolFlags.RegularEnumExcludes);
const EXPORT_STAR = flagPair(SymbolFlags.ExportStar, EMPTY);
const EXPORT_ALIAS = flagPair(SymbolFlags.Alias, SymbolFlags.All);
const EXPORT_PROPERTY = flagPair(SymbolFlags.Property, SymbolFlags.All);

const inContainer =
  (flags: SymbolFlagPair): NodeBinder =>
  (binding, node, scope) => {
    if (scope.containerIsFile) {
      declareSourceFileMember(binding, node, flags);
    }
  };

const inBlock =
  (flags: SymbolFlagPair): NodeBinder =>
  (binding, node, scope) => {
    if (scope.blockIsFile) {
      declareBlockScoped(binding, node, flags);
    }
  };

const bindFunction: NodeBinder = (binding, node, scope) => {
  if (binding.strict) {
    inBlock(FUNCTION)(binding, node, scope);
    return;
  }
  inContainer(FUNCTION)(binding, node, scope);
};

const bindEnum: NodeBinder = (binding, node, scope) => {
  if (isConstEnum(node)) {
    inBlock(CONST_ENUM)(binding, node, scope);
    return;
  }
  inBlock(REGULAR_ENUM)(binding, node, scope);
};

const isModuleAugmentationExternal = (binding: FileBinding, node: Node): boolean =>
  isSourceFile(node.parent) && binding.isExternalModule;

const moduleFlags = (binding: FileBinding, node: Node): SymbolFlagPair => {
  if (isAmbientModule(node) && !isModuleAugmentationExternal(binding, node)) {
    return VALUE_MODULE;
  }
  if (getModuleInstanceState(node) === NON_INSTANTIATED) {
    return NAMESPACE_MODULE;
  }
  return VALUE_MODULE;
};

const bindModuleDeclaration: NodeBinder = (binding, node, scope) => {
  if (scope.containerIsFile && isModuleDeclaration(node)) {
    declareSourceFileMember(binding, node, moduleFlags(binding, node));
  }
};

const bindImportClause: NodeBinder = (binding, node, scope) => {
  if (isImportClause(node) && Predicate.isNotUndefined(node.name)) {
    inContainer(ALIAS)(binding, node, scope);
  }
};

const hasFileExports = (binding: FileBinding, scope: Scope): boolean =>
  scope.containerIsFile && Option.isSome(Option.fromNullishOr(binding.symbol));

const bindExportClause = (binding: FileBinding, node: ExportDeclaration): void => {
  const clause = node.exportClause;
  if (Predicate.isUndefined(clause)) {
    declareExport(binding, node, EXPORT_STAR);
    return;
  }
  if (isNamespaceExport(clause)) {
    declareExport(binding, clause, ALIAS);
  }
};

const bindExportDeclaration: NodeBinder = (binding, node, scope) => {
  if (hasFileExports(binding, scope) && isExportDeclaration(node)) {
    bindExportClause(binding, node);
  }
};

const bindExportAssignment: NodeBinder = (binding, node, scope) => {
  if (!hasFileExports(binding, scope) || !isExportAssignment(node)) {
    return;
  }
  const flags = Option.getOrElse(
    Option.liftPredicate(EXPORT_ALIAS, () => isAliasableExpression(node.expression)),
    () => EXPORT_PROPERTY,
  );
  const symbol = declareExport(binding, node, flags);
  if (node.isExportEquals) {
    setValueDeclaration(symbol, node);
  }
};

const DECLARATION_BINDERS: ReadonlyMap<SyntaxKind, NodeBinder> = new Map([
  [SyntaxKind.FunctionDeclaration, bindFunction],
  [SyntaxKind.ClassDeclaration, inBlock(flagPair(SymbolFlags.Class, SymbolFlags.ClassExcludes))],
  [
    SyntaxKind.InterfaceDeclaration,
    inBlock(flagPair(SymbolFlags.Interface, SymbolFlags.InterfaceExcludes)),
  ],
  [
    SyntaxKind.TypeAliasDeclaration,
    inBlock(flagPair(SymbolFlags.TypeAlias, SymbolFlags.TypeAliasExcludes)),
  ],
  [SyntaxKind.EnumDeclaration, bindEnum],
  [SyntaxKind.ModuleDeclaration, bindModuleDeclaration],
  [SyntaxKind.ImportEqualsDeclaration, inContainer(ALIAS)],
  [SyntaxKind.NamespaceImport, inContainer(ALIAS)],
  [SyntaxKind.ImportSpecifier, inContainer(ALIAS)],
  [SyntaxKind.ExportSpecifier, inContainer(ALIAS)],
  [SyntaxKind.ImportClause, bindImportClause],
  [SyntaxKind.ExportDeclaration, bindExportDeclaration],
  [SyntaxKind.ExportAssignment, bindExportAssignment],
]);

export { DECLARATION_BINDERS };
export type { NodeBinder };
