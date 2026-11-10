import { Array as Arr, Option } from "effect";
import { escapeLeadingUnderscores as escapeSymbolName, getNameOfDeclaration } from "typescript/ast";
import type { Declaration, Expression, Node, SourceFile } from "typescript/ast";
import {
  isBinaryExpression,
  isClassDeclaration,
  isEnumDeclaration,
  isExportAssignment,
  isExportSpecifier,
  isExpression,
  isFunctionDeclaration,
  isIdentifier,
  isImportClause,
  isImportEqualsDeclaration,
  isImportSpecifier,
  isInterfaceDeclaration,
  isModuleDeclaration,
  isNamespaceExport,
  isNamespaceImport,
  isSourceFile,
  isTypeAliasDeclaration,
  isVariableDeclaration,
} from "typescript/ast/is";
import { SymbolFlags } from "typescript/sync";
import type { Symbol as CheckerSymbol } from "typescript/sync";

import { escapeLeadingUnderscores } from "./binder-symbols.ts";
import type { BoundSymbol } from "./binder-symbols.ts";
import { bindingOf } from "./binder.ts";
import type { CheckerSession } from "./checker-session.ts";
import { hasFlag } from "./flags.ts";

type AnySymbol = BoundSymbol | CheckerSymbol;

type SymbolConverter = (session: CheckerSession, symbol: AnySymbol) => CheckerSymbol;

const EXPORT_EQUALS = "export=";

const isCheckerSymbol = (symbol: AnySymbol): symbol is CheckerSymbol => "getExports" in symbol;

const sourceFileOf = (node: Node): SourceFile => {
  let current = node;
  while (!isSourceFile(current)) {
    current = current.parent;
  }
  return current;
};

const firstDeclaration = (symbol: BoundSymbol): Option.Option<Node> =>
  Option.fromNullishOr(symbol.declarations).pipe(
    Option.flatMap((declarations) => Arr.head(declarations)),
  );

const NAMEABLE_GUARDS: readonly ((node: Node) => boolean)[] = [
  isExpression,
  isFunctionDeclaration,
  isClassDeclaration,
  isVariableDeclaration,
  isModuleDeclaration,
  isEnumDeclaration,
  isInterfaceDeclaration,
  isTypeAliasDeclaration,
  isImportEqualsDeclaration,
  isImportClause,
  isImportSpecifier,
  isNamespaceImport,
  isExportSpecifier,
  isExportAssignment,
  isNamespaceExport,
];

const isNameable = (node: Node): node is Declaration | Expression =>
  NAMEABLE_GUARDS.some((guard) => guard(node));

const nameNode = (declaration: Node): Node =>
  Option.liftPredicate(declaration, isNameable).pipe(
    Option.flatMapNullishOr((nameable) => getNameOfDeclaration(nameable)),
    Option.getOrElse(() => declaration),
  );

const missingSymbol = (symbol: BoundSymbol): Error =>
  new Error(`TypeScript has no symbol for ${symbol.name}`);

const fromSourceFile = (
  session: CheckerSession,
  file: SourceFile,
  symbol: BoundSymbol,
): CheckerSymbol =>
  Option.fromNullishOr(
    session.checker.getSymbolOfSourceFile(`${session.mountPath}${file.fileName}`),
  ).pipe(Option.getOrThrowWith(() => missingSymbol(symbol)));

const isFileSymbol = (symbol: BoundSymbol): boolean =>
  firstDeclaration(symbol).pipe(Option.exists((declaration) => isSourceFile(declaration)));

const fromParentExports = (
  session: CheckerSession,
  symbol: BoundSymbol,
  convert: SymbolConverter,
): Option.Option<CheckerSymbol> =>
  Option.fromNullishOr(symbol.parent).pipe(
    Option.filter((parent) => isFileSymbol(parent)),
    Option.flatMap((parent) =>
      Option.fromNullishOr(
        convert(session, parent).getExports().get(escapeSymbolName(symbol.name)),
      ),
    ),
  );

const fromPosition = (
  session: CheckerSession,
  declaration: Node,
  symbol: BoundSymbol,
): CheckerSymbol => {
  const file = sourceFileOf(declaration);
  const found = session.checker.getSymbolAtPosition(
    `${session.mountPath}${file.fileName}`,
    nameNode(declaration).getStart(file),
  );
  return Option.fromNullishOr(found).pipe(Option.getOrThrowWith(() => missingSymbol(symbol)));
};

const fromBound = (
  session: CheckerSession,
  symbol: BoundSymbol,
  convert: SymbolConverter,
): CheckerSymbol => {
  const declaration = firstDeclaration(symbol).pipe(
    Option.getOrThrowWith(() => new Error(`Symbol ${symbol.name} has no declaration`)),
  );
  if (isSourceFile(declaration)) {
    return fromSourceFile(session, declaration, symbol);
  }
  return fromParentExports(session, symbol, convert).pipe(
    Option.getOrElse(() => fromPosition(session, declaration, symbol)),
  );
};

const toCheckerSymbol: SymbolConverter = (session, symbol) => {
  if (isCheckerSymbol(symbol)) {
    return symbol;
  }
  return fromBound(session, symbol, toCheckerSymbol);
};

const assignedIdentifier = (declaration: Node): Option.Option<Node> => {
  if (isBinaryExpression(declaration)) {
    return Option.liftPredicate(declaration.right, (node) => isIdentifier(node));
  }
  if (isExportAssignment(declaration)) {
    return Option.liftPredicate(declaration.expression, (node) => isIdentifier(node));
  }
  return Option.none();
};

const localNamed = (identifier: Node): Option.Option<BoundSymbol> =>
  bindingOf(sourceFileOf(identifier)).pipe(
    Option.flatMap((binding) =>
      Option.liftPredicate(identifier, (node) => isIdentifier(node)).pipe(
        Option.flatMap((node) =>
          Option.fromNullishOr(binding.locals.get(escapeLeadingUnderscores(node.text))),
        ),
      ),
    ),
  );

const boundExpandoExports = (moduleSymbol: BoundSymbol): readonly BoundSymbol[] =>
  Option.fromNullishOr(moduleSymbol.exports).pipe(
    Option.flatMap((exports) => Option.fromNullishOr(exports.get(EXPORT_EQUALS))),
    Option.flatMap((exportEquals) => firstDeclaration(exportEquals)),
    Option.flatMap((declaration) => assignedIdentifier(declaration)),
    Option.flatMap((identifier) => localNamed(identifier)),
    Option.flatMap((local) => Option.fromNullishOr(local.exports)),
    Option.map((members) =>
      [...members.values()].filter((member) => hasFlag(member.flags, SymbolFlags.Assignment)),
    ),
    Option.getOrElse((): readonly BoundSymbol[] => []),
  );

export { EXPORT_EQUALS, boundExpandoExports, isCheckerSymbol, toCheckerSymbol };
export type { AnySymbol, SymbolConverter };
