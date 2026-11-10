import { Option, Predicate } from "effect";
import type { BinaryExpression, CallExpression, Node } from "typescript/ast";
import { isIdentifier, isPropertyAccessExpression, isVariableDeclaration } from "typescript/ast/is";
import { SymbolFlags } from "typescript/sync";

import { declare, exportsOf } from "./binder-declarations.ts";
import type { FileBinding, Scope, SymbolFlagPair } from "./binder-declarations.ts";
import {
  addDeclarationToSymbol,
  createSymbol,
  escapeLeadingUnderscores,
  exportOf,
} from "./binder-symbols.ts";
import type { BoundSymbol } from "./binder-symbols.ts";
import {
  getElementOrPropertyAccessName,
  isAccessExpression,
  isAliasableExpression,
  isAssignmentExpression,
  isExportsIdentifier,
  isModuleExportsAccessExpression,
} from "./binder-syntax.ts";
import type { AccessExpression } from "./binder-syntax.ts";
import { EMPTY, combineFlags } from "./flags.ts";

interface EntityNameWalk {
  readonly node: Node;
  readonly containerIsFile: boolean;
  readonly action: (
    name: Node,
    symbol: Option.Option<BoundSymbol>,
    parent: Option.Option<BoundSymbol>,
  ) => Option.Option<BoundSymbol>;
}

const MAX_ALIAS_STEPS = 100;
const ALIAS_STEP = 1;
const EXTENSION = /\.[^./]*$/u;
const MODULE_ASSIGNMENT = combineFlags(SymbolFlags.Module, SymbolFlags.Assignment);
const EXPORT_PROPERTY: SymbolFlagPair = {
  includes: combineFlags(SymbolFlags.Property, SymbolFlags.ExportValue),
  excludes: EMPTY,
};
const EXPORT_ALIAS: SymbolFlagPair = { includes: SymbolFlags.Alias, excludes: EMPTY };

const createFileSymbol = (binding: FileBinding): void => {
  const symbol = createSymbol(EMPTY, `"${binding.file.fileName.replace(EXTENSION, "")}"`);
  addDeclarationToSymbol(symbol, binding.file, SymbolFlags.ValueModule);
  binding.symbol = symbol;
};

const lookupSymbolForName = (binding: FileBinding, name: string): Option.Option<BoundSymbol> => {
  const local = Option.fromNullishOr(binding.locals.get(name)).pipe(
    Option.map((found) => found.exportSymbol ?? found),
  );
  return local.pipe(
    Option.orElse(() =>
      Option.fromNullishOr(binding.symbol).pipe(Option.flatMap((file) => exportOf(file, name))),
    ),
  );
};

const lookupIdentifier = (binding: FileBinding, node: Node): Option.Option<BoundSymbol> =>
  Option.flatMap(Option.liftPredicate(node, isIdentifier), (identifier) =>
    lookupSymbolForName(binding, escapeLeadingUnderscores(identifier.text)),
  );

const variableInitializer = (binding: FileBinding, node: Node): Option.Option<Node> =>
  lookupIdentifier(binding, node).pipe(
    Option.flatMap((symbol) => Option.fromNullishOr(symbol.valueDeclaration)),
    Option.filter(isVariableDeclaration),
    Option.flatMap((declaration) => Option.fromNullishOr(declaration.initializer)),
  );

const aliasSources = (binding: FileBinding, node: Node): readonly Node[] =>
  variableInitializer(binding, node).pipe(
    Option.map((initializer): readonly Node[] =>
      Option.match(Option.liftPredicate(initializer, isAssignmentExpression), {
        onNone: () => [initializer],
        onSome: (assignment) => [initializer, assignment.left, assignment.right],
      }),
    ),
    Option.getOrElse((): readonly Node[] => []),
  );

const isExportsReference = (node: Node): boolean =>
  isExportsIdentifier(node) || isModuleExportsAccessExpression(node);

const searchExportsAlias = (
  binding: FileBinding,
  queue: readonly Node[],
  steps: number,
): boolean => {
  const [next, ...rest] = queue;
  if (Predicate.isUndefined(next) || steps >= MAX_ALIAS_STEPS) {
    return false;
  }
  return (
    isExportsReference(next) ||
    searchExportsAlias(binding, [...rest, ...aliasSources(binding, next)], steps + ALIAS_STEP)
  );
};

const isExportsOrModuleExportsOrAlias = (binding: FileBinding, node: Node): boolean =>
  searchExportsAlias(binding, [node], EMPTY);

const setCommonJsModuleIndicator = (binding: FileBinding, node: Node): boolean => {
  if (binding.isExternalModule) {
    return false;
  }
  if (Predicate.isUndefined(binding.commonJsModuleIndicator)) {
    binding.commonJsModuleIndicator = node;
    createFileSymbol(binding);
  }
  return true;
};

const accessNameOrArgument = (node: AccessExpression): Node => {
  if (isPropertyAccessExpression(node)) {
    return node.name;
  }
  return node.argumentExpression;
};

const lookupInFileContainer = (
  binding: FileBinding,
  walk: EntityNameWalk,
): Option.Option<BoundSymbol> =>
  Option.liftPredicate(binding, () => walk.containerIsFile).pipe(
    Option.flatMap((bound) => lookupIdentifier(bound, walk.node)),
  );

const memberOfAccess = (
  node: AccessExpression,
  parent: Option.Option<BoundSymbol>,
): Option.Option<BoundSymbol> =>
  getElementOrPropertyAccessName(node).pipe(
    Option.flatMap((key) => parent.pipe(Option.flatMap((symbol) => exportOf(symbol, key)))),
  );

const forEachIdentifierInEntityName = (
  binding: FileBinding,
  walk: EntityNameWalk,
): Option.Option<BoundSymbol> => {
  const { node } = walk;
  if (isExportsOrModuleExportsOrAlias(binding, node)) {
    return Option.fromNullishOr(binding.symbol);
  }
  if (isIdentifier(node)) {
    return walk.action(node, lookupInFileContainer(binding, walk), Option.none());
  }
  if (!isAccessExpression(node)) {
    return Option.none();
  }
  const parent = forEachIdentifierInEntityName(binding, { ...walk, node: node.expression });
  return walk.action(accessNameOrArgument(node), memberOfAccess(node, parent), parent);
};

const markModuleAssignment = (
  name: Node,
  symbol: Option.Option<BoundSymbol>,
): Option.Option<BoundSymbol> =>
  symbol.pipe(
    Option.map((found) => {
      addDeclarationToSymbol(found, name, MODULE_ASSIGNMENT);
      return found;
    }),
  );

const exportsPropertyFlags = (node: BinaryExpression): SymbolFlagPair => {
  const target = node.left;
  const isAlias =
    isAliasableExpression(node.right) &&
    isAccessExpression(target) &&
    (isExportsIdentifier(target.expression) || isModuleExportsAccessExpression(target.expression));
  return Option.getOrElse(
    Option.liftPredicate(EXPORT_ALIAS, () => isAlias),
    () => EXPORT_PROPERTY,
  );
};

const bindExportsPropertyAssignment = (
  binding: FileBinding,
  node: BinaryExpression,
  scope: Scope,
): void => {
  const { left } = node;
  if (!setCommonJsModuleIndicator(binding, node) || !isAccessExpression(left)) {
    return;
  }
  const owner = forEachIdentifierInEntityName(binding, {
    node: left.expression,
    containerIsFile: scope.containerIsFile,
    action: markModuleAssignment,
  });
  if (Option.isSome(owner)) {
    declare(binding, { target: exportsOf(owner), node: left, flags: exportsPropertyFlags(node) });
  }
};

const bindObjectDefinePropertyExport = (
  binding: FileBinding,
  node: CallExpression,
  scope: Scope,
): void => {
  const [target] = node.arguments;
  if (!setCommonJsModuleIndicator(binding, node) || Predicate.isUndefined(target)) {
    return;
  }
  const owner = forEachIdentifierInEntityName(binding, {
    node: target,
    containerIsFile: scope.containerIsFile,
    action: markModuleAssignment,
  });
  if (Option.isSome(owner)) {
    declare(binding, { target: exportsOf(owner), node, flags: EXPORT_PROPERTY });
  }
};

export {
  bindExportsPropertyAssignment,
  bindObjectDefinePropertyExport,
  createFileSymbol,
  forEachIdentifierInEntityName,
  isExportsOrModuleExportsOrAlias,
  lookupIdentifier,
  lookupSymbolForName,
  setCommonJsModuleIndicator,
  variableInitializer,
};
export type { EntityNameWalk };
