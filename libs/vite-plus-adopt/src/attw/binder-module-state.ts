import { Array as Arr, Option, Predicate } from "effect";
import { ModifierFlags } from "typescript/ast";
import type { ExportDeclaration, ExportSpecifier, NamedExports, Node } from "typescript/ast";
import {
  isEnumDeclaration,
  isExportDeclaration,
  isImportDeclaration,
  isImportEqualsDeclaration,
  isInterfaceDeclaration,
  isModuleBlock,
  isModuleDeclaration,
  isNamedExports,
  isTypeAliasDeclaration,
} from "typescript/ast/is";

import { hasSyntacticModifier, isNodeValue } from "./binder-names.ts";
import { nameText } from "./binder-syntax.ts";

const NON_INSTANTIATED = 0;
const INSTANTIATED = 1;
const CONST_ENUM_ONLY = 2;

type ModuleInstanceState = typeof NON_INSTANTIATED | typeof INSTANTIATED | typeof CONST_ENUM_ONLY;

type StateOf = (node: Node) => ModuleInstanceState;

const isConstEnum = (node: Node): boolean => hasSyntacticModifier(node, ModifierFlags.Const);

const keepFirstInstantiated = (
  state: ModuleInstanceState,
  next: ModuleInstanceState,
): ModuleInstanceState => {
  if (state === INSTANTIATED || next <= state) {
    return state;
  }
  return next;
};

const keepBlockState = (
  state: ModuleInstanceState,
  next: ModuleInstanceState,
): ModuleInstanceState => {
  if (state === INSTANTIATED || next === NON_INSTANTIATED) {
    return state;
  }
  return next;
};

const declaresName = (statement: Node, name: string): boolean =>
  "name" in statement &&
  isNodeValue(statement.name) &&
  Option.contains(nameText(statement.name), name);

const statementsOf = (node: Node): readonly Node[] => {
  if (isModuleBlock(node)) {
    return node.statements;
  }
  return [];
};

const aliasTargetState = (specifier: ExportSpecifier, stateOf: StateOf): ModuleInstanceState => {
  const name = Option.getOrElse(nameText(specifier.propertyName ?? specifier.name), () => "");
  const matching = statementsOf(specifier.parent.parent.parent).filter((statement) =>
    declaresName(statement, name),
  );
  if (!Arr.isReadonlyArrayNonEmpty(matching)) {
    return INSTANTIATED;
  }
  return Arr.reduce(matching, NON_INSTANTIATED, (state: ModuleInstanceState, statement) =>
    keepFirstInstantiated(state, stateOf(statement)),
  );
};

const localNamedExports = (node: ExportDeclaration): Option.Option<NamedExports> =>
  Option.fromNullishOr(node.exportClause).pipe(
    Option.flatMap((clause) => Option.liftPredicate(clause, isNamedExports)),
    Option.filter(() => Predicate.isUndefined(node.moduleSpecifier)),
  );

const exportDeclarationState = (node: ExportDeclaration, stateOf: StateOf): ModuleInstanceState => {
  if (node.isTypeOnly) {
    return NON_INSTANTIATED;
  }
  return Option.match(localNamedExports(node), {
    onNone: () => INSTANTIATED,
    onSome: (clause) =>
      Arr.reduce(clause.elements, NON_INSTANTIATED, (state: ModuleInstanceState, specifier) =>
        keepFirstInstantiated(state, aliasTargetState(specifier, stateOf)),
      ),
  });
};

const isTypeDeclaration = (node: Node): boolean =>
  isInterfaceDeclaration(node) || isTypeAliasDeclaration(node);

const isConstEnumDeclaration = (node: Node): boolean =>
  isEnumDeclaration(node) && isConstEnum(node);

const isUnexportedImport = (node: Node): boolean =>
  (isImportDeclaration(node) || isImportEqualsDeclaration(node)) &&
  !hasSyntacticModifier(node, ModifierFlags.Export);

const DECLARATION_STATES: readonly (readonly [
  matches: (node: Node) => boolean,
  state: ModuleInstanceState,
])[] = [
  [isTypeDeclaration, NON_INSTANTIATED],
  [isConstEnumDeclaration, CONST_ENUM_ONLY],
  [isUnexportedImport, NON_INSTANTIATED],
];

const declarationState = (node: Node): Option.Option<ModuleInstanceState> =>
  Option.fromNullishOr(DECLARATION_STATES.find(([matches]) => matches(node))).pipe(
    Option.map(([, state]) => state),
  );

const containerState = (node: Node, stateOf: StateOf): ModuleInstanceState => {
  if (isExportDeclaration(node)) {
    return exportDeclarationState(node, stateOf);
  }
  if (isModuleBlock(node)) {
    return Arr.reduce(node.statements, NON_INSTANTIATED, (state: ModuleInstanceState, statement) =>
      keepBlockState(state, stateOf(statement)),
    );
  }
  if (isModuleDeclaration(node)) {
    return Option.match(Option.fromNullishOr(node.body), {
      onNone: () => INSTANTIATED,
      onSome: stateOf,
    });
  }
  return INSTANTIATED;
};

const getModuleInstanceState: StateOf = (node) =>
  Option.getOrElse(declarationState(node), () => containerState(node, getModuleInstanceState));

export { NON_INSTANTIATED, getModuleInstanceState, isConstEnum };
export type { ModuleInstanceState, StateOf };
