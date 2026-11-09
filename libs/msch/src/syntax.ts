import { Array as Arr, Option, String as Str, pipe } from "effect";

import {
  isEnumDeclaration,
  isIdentifier,
  isInterfaceDeclaration,
  isTypeAliasDeclaration,
  SyntaxKind,
} from "./compiler.ts";
import type {
  Checker,
  Declaration,
  EnumDeclaration,
  InterfaceDeclaration,
  Node,
  Program,
  SourceFile,
  TypeSymbol,
  Type,
  TypeAliasDeclaration,
} from "./compiler.ts";
import { NODE_MODULES } from "./dependencies.ts";

const NODE_MODULES_SEGMENT = `/${NODE_MODULES}/`;

const POSITION_BASE = 1;

const uniqueByReference = <Item>(items: readonly Item[]): readonly Item[] =>
  Arr.dedupeWith(items, (left, right) => left === right);

const childrenOf = (node: Node): readonly Node[] => {
  const children: Node[] = [];
  node.forEachChild((child) => {
    children.push(child);
  });
  return children;
};

const descendantsOf = (node: Node): readonly Node[] =>
  pipe(
    childrenOf(node),
    Arr.flatMap((child) => Arr.prepend(descendantsOf(child), child)),
  );

const isExternalFile =
  (program: Program) =>
  (sourceFile: SourceFile): boolean =>
    Str.includes(NODE_MODULES_SEGMENT)(sourceFile.fileName) ||
    program.isSourceFileFromExternalLibrary(sourceFile);

const isExternalDeclaration =
  (program: Program) =>
  (declaration: Node): boolean =>
    isExternalFile(program)(declaration.getSourceFile());

const ALIAS_KINDS: ReadonlySet<SyntaxKind> = new Set([
  SyntaxKind.ImportSpecifier,
  SyntaxKind.ImportClause,
  SyntaxKind.NamespaceImport,
  SyntaxKind.ExportSpecifier,
  SyntaxKind.ImportEqualsDeclaration,
  SyntaxKind.ExportAssignment,
]);

const declarationsOf = (symbol: TypeSymbol): readonly Declaration[] =>
  pipe(
    symbol.declarations,
    Arr.flatMap((handle) => Option.toArray(Option.fromUndefinedOr(handle.resolve()))),
  );

const isAliasDeclaration = (declaration: Node): boolean => ALIAS_KINDS.has(declaration.kind);

const resolvedSymbol =
  (checker: Checker) =>
  (symbol: TypeSymbol): TypeSymbol => {
    if (
      !pipe(
        declarationsOf(symbol),
        Arr.some((declaration) => isAliasDeclaration(declaration)),
      )
    ) {
      return symbol;
    }
    return checker.getAliasedSymbol(symbol);
  };

const symbolAt =
  (checker: Checker) =>
  (node: Node): Option.Option<TypeSymbol> =>
    Option.fromUndefinedOr(checker.getSymbolAtLocation(node)).pipe(
      Option.map(resolvedSymbol(checker)),
    );

const referencedSymbols =
  (checker: Checker) =>
  (node: Node): readonly TypeSymbol[] => {
    const identifiers = pipe(
      Arr.prepend(descendantsOf(node), node),
      Arr.filter((candidate) => isIdentifier(candidate)),
    );
    const symbols = pipe(
      checker.getSymbolAtLocation(identifiers),
      Arr.flatMap((symbol) => Option.toArray(Option.fromUndefinedOr(symbol))),
      Arr.map(resolvedSymbol(checker)),
    );
    return uniqueByReference(symbols);
  };

const lineOf = (node: Node): number => {
  const sourceFile = node.getSourceFile();
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + POSITION_BASE;
};

const columnOf = (node: Node): number => {
  const sourceFile = node.getSourceFile();
  return (
    sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).character + POSITION_BASE
  );
};

const contains =
  (outer: Node) =>
  (inner: Node): boolean =>
    outer.getSourceFile().fileName === inner.getSourceFile().fileName &&
    outer.getStart() <= inner.getStart() &&
    inner.getEnd() <= outer.getEnd();

const isTypeDeclaration = (
  declaration: Node,
): declaration is TypeAliasDeclaration | InterfaceDeclaration | EnumDeclaration =>
  isTypeAliasDeclaration(declaration) ||
  isInterfaceDeclaration(declaration) ||
  isEnumDeclaration(declaration);

const isGenericDeclaration = (declaration: Node): boolean =>
  (isTypeAliasDeclaration(declaration) || isInterfaceDeclaration(declaration)) &&
  Arr.isReadonlyArrayNonEmpty(declaration.typeParameters ?? []);

const propertyNamesOf =
  (checker: Checker) =>
  (type: Type): readonly string[] =>
    pipe(
      checker.getPropertiesOfType(type),
      Arr.map((property) => property.name),
    );

export {
  NODE_MODULES_SEGMENT,
  POSITION_BASE,
  childrenOf,
  columnOf,
  contains,
  declarationsOf,
  descendantsOf,
  isExternalDeclaration,
  isGenericDeclaration,
  isTypeDeclaration,
  lineOf,
  propertyNamesOf,
  referencedSymbols,
  resolvedSymbol,
  symbolAt,
  uniqueByReference,
};
