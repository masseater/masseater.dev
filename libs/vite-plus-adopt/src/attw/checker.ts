import { Option } from "effect";
import { escapeLeadingUnderscores as escapeSymbolName } from "typescript/ast";
import { ObjectFlags, SignatureKind, SymbolFlags, TypeFlags, isObjectType } from "typescript/sync";
import type { Checker, Symbol as CheckerSymbol, Type } from "typescript/sync";

import { openCheckerSession } from "./checker-session.ts";
import type { CheckerProgram, CheckerSession } from "./checker-session.ts";
import {
  EXPORT_EQUALS,
  boundExpandoExports,
  isCheckerSymbol,
  toCheckerSymbol,
} from "./checker-symbols.ts";
import type { AnySymbol } from "./checker-symbols.ts";
import { hasFlag, withFlags } from "./flags.ts";
import { isTypeOnlyImportOrExportDeclaration } from "./type-only.ts";

interface TypeCheckerFacade {
  readonly resolveExternalModuleSymbol: (symbol: AnySymbol) => CheckerSymbol;
  readonly getTypeOfSymbol: (symbol: AnySymbol) => Type;
  readonly getExportsAndPropertiesOfModule: (symbol: AnySymbol) => readonly AnySymbol[];
  readonly getSymbolFlags: (symbol: AnySymbol, excludeTypeOnlyMeanings: boolean) => number;
  readonly getAliasedSymbol: (symbol: AnySymbol) => CheckerSymbol;
  readonly getAnyType: Checker["getAnyType"];
  readonly isArrayLikeType: Checker["isArrayLikeType"];
  readonly getPropertyOfType: Checker["getPropertyOfType"];
  readonly typeHasCallOrConstructSignatures: (type: Type) => boolean;
  readonly dispose: () => void;
}

const UNKNOWN = "unknown";
const NONE = 0;

const isAlias = (symbol: AnySymbol): boolean => hasFlag(symbol.flags, SymbolFlags.Alias);

const isUnknownSymbol = (symbol: CheckerSymbol): boolean =>
  symbol.name === UNKNOWN &&
  symbol.declarations.length === NONE &&
  symbol.flags === SymbolFlags.Property;

const resolveExternalModuleSymbol = (session: CheckerSession, symbol: AnySymbol): CheckerSymbol => {
  const moduleSymbol = toCheckerSymbol(session, symbol);
  return Option.fromNullishOr(moduleSymbol.getExports().get(escapeSymbolName(EXPORT_EQUALS))).pipe(
    Option.map((exportEquals) => {
      if (isAlias(exportEquals)) {
        return session.checker.getAliasedSymbol(exportEquals);
      }
      return exportEquals;
    }),
    Option.getOrElse(() => moduleSymbol),
  );
};

const isClassInstanceType = (type: Type): boolean =>
  isObjectType(type) && hasFlag(type.objectFlags, ObjectFlags.Class);

const isListType = (checker: Checker, type: Type): boolean =>
  checker.isArrayType(type) || checker.isTupleType(type);

const shouldTreatPropertiesAsExports = (checker: Checker, type: Type): boolean =>
  !hasFlag(type.flags, TypeFlags.Primitive) &&
  !isClassInstanceType(type) &&
  !isListType(checker, type);

const expandosOf = (
  symbol: AnySymbol,
  properties: readonly CheckerSymbol[],
): readonly AnySymbol[] => {
  if (isCheckerSymbol(symbol)) {
    return [];
  }
  const names = new Set(properties.map((property) => property.name));
  return boundExpandoExports(symbol).filter((member) => !names.has(member.name));
};

const propertiesAsExports = (
  session: CheckerSession,
  symbol: AnySymbol,
  exportEquals: CheckerSymbol,
): readonly AnySymbol[] => {
  const type = session.checker.getTypeOfSymbol(exportEquals);
  if (!shouldTreatPropertiesAsExports(session.checker, type)) {
    return [];
  }
  const properties = session.checker.getPropertiesOfType(type);
  return [...properties, ...expandosOf(symbol, properties)];
};

const exportsAndPropertiesOf = (
  session: CheckerSession,
  symbol: AnySymbol,
): readonly AnySymbol[] => {
  const moduleSymbol = toCheckerSymbol(session, symbol);
  const exports = session.checker.getExportsOfModule(moduleSymbol);
  const exportEquals = resolveExternalModuleSymbol(session, moduleSymbol);
  if (exportEquals.id === moduleSymbol.id) {
    return exports;
  }
  return [...exports, ...propertiesAsExports(session, symbol, exportEquals)];
};

const aliasHasTypeOnlyDeclaration = (session: CheckerSession, symbol: CheckerSymbol): boolean =>
  symbol.declarations.some((handle) =>
    Option.fromNullishOr(handle.resolve(session.project)).pipe(
      Option.exists((declaration) => isTypeOnlyImportOrExportDeclaration(declaration)),
    ),
  );

const aliasChainIsTypeOnly = (session: CheckerSession, symbol: CheckerSymbol): boolean => {
  const seen = new Set<number>();
  const isUnvisitedAlias = (candidate: CheckerSymbol): boolean =>
    isAlias(candidate) && !seen.has(candidate.id);
  let current = Option.some(symbol).pipe(Option.filter((candidate) => isUnvisitedAlias(candidate)));
  while (Option.isSome(current)) {
    seen.add(current.value.id);
    if (aliasHasTypeOnlyDeclaration(session, current.value)) {
      return true;
    }
    current = Option.fromNullishOr(session.checker.getImmediateAliasedSymbol(current.value)).pipe(
      Option.filter((next) => isUnvisitedAlias(next)),
    );
  }
  return false;
};

const resolvedAliasFlags = (
  session: CheckerSession,
  symbol: AnySymbol,
  target: CheckerSymbol,
): number => {
  const resolved = session.checker.getAliasedSymbol(target);
  if (resolved.id === target.id) {
    return symbol.flags;
  }
  if (isUnknownSymbol(resolved)) {
    return SymbolFlags.All;
  }
  return withFlags(symbol.flags, resolved.flags);
};

const symbolFlagsOf = (
  session: CheckerSession,
  symbol: AnySymbol,
  excludeTypeOnlyMeanings: boolean,
): number => {
  if (!isAlias(symbol)) {
    return symbol.flags;
  }
  const target = toCheckerSymbol(session, symbol);
  if (excludeTypeOnlyMeanings && aliasChainIsTypeOnly(session, target)) {
    return symbol.flags;
  }
  return resolvedAliasFlags(session, symbol, target);
};

const hasCallOrConstructSignatures = (checker: Checker, type: Type): boolean =>
  checker.getSignaturesOfType(type, SignatureKind.Call).length > NONE ||
  checker.getSignaturesOfType(type, SignatureKind.Construct).length > NONE;

const createTypeChecker = (program: CheckerProgram): TypeCheckerFacade => {
  const session = openCheckerSession(program);
  const { checker } = session;
  return {
    resolveExternalModuleSymbol: (symbol) => resolveExternalModuleSymbol(session, symbol),
    getTypeOfSymbol: (symbol) => checker.getTypeOfSymbol(toCheckerSymbol(session, symbol)),
    getExportsAndPropertiesOfModule: (symbol) => exportsAndPropertiesOf(session, symbol),
    getSymbolFlags: (symbol, excludeTypeOnlyMeanings) =>
      symbolFlagsOf(session, symbol, excludeTypeOnlyMeanings),
    getAliasedSymbol: (symbol) => checker.getAliasedSymbol(toCheckerSymbol(session, symbol)),
    getAnyType: checker.getAnyType,
    isArrayLikeType: checker.isArrayLikeType,
    getPropertyOfType: checker.getPropertyOfType,
    typeHasCallOrConstructSignatures: (type) => hasCallOrConstructSignatures(checker, type),
    dispose: session.dispose,
  };
};

export { createTypeChecker };
export type { TypeCheckerFacade };
