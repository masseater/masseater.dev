import { Array as Arr, Option, String as Str, pipe } from "effect";

import {
  isEnumDeclaration,
  isExportAssignment,
  isExportDeclaration,
  isIdentifier,
  isImportDeclaration,
  isInterfaceDeclaration,
  isPropertyAccessExpression,
  isStringLiteral,
  isTypeAliasDeclaration,
  SyntaxKind,
} from "./compiler.ts";
import type {
  Checker,
  Declaration,
  EnumDeclaration,
  Expression,
  InterfaceDeclaration,
  Node,
  Program,
  SourceFile,
  TypeSymbol,
  Type,
  TypeAliasDeclaration,
} from "./compiler.ts";
import { NODE_MODULES } from "./repository-files.ts";

const NODE_MODULES_SEGMENT = `/${NODE_MODULES}/`;

export const POSITION_BASE = 1;

export const uniqueByReference = <Item>(items: readonly Item[]): readonly Item[] =>
  Arr.dedupeWith(items, (left, right) => left === right);

export const childrenOf = (node: Node): readonly Node[] => {
  const children: Node[] = [];
  node.forEachChild((child) => {
    children.push(child);
  });
  return children;
};

const SCOPE_PREFIX = "@";
const SCOPED_SEGMENTS = 2;
const UNSCOPED_SEGMENTS = 1;

export const packageOf = (fileName: string): string => {
  const afterModules = pipe(
    fileName,
    Str.lastIndexOf(NODE_MODULES_SEGMENT),
    Option.match({
      onNone: () => fileName,
      onSome: (index) => Str.slice(index + NODE_MODULES_SEGMENT.length)(fileName),
    }),
  );
  const segments = Str.split("/")(afterModules);
  if (Str.startsWith(SCOPE_PREFIX)(afterModules)) {
    return pipe(Arr.take(segments, SCOPED_SEGMENTS), Arr.join("/"));
  }
  return pipe(Arr.take(segments, UNSCOPED_SEGMENTS), Arr.join("/"));
};

export const descendantsOf = (node: Node): readonly Node[] =>
  pipe(
    childrenOf(node),
    Arr.flatMap((child) => Arr.prepend(descendantsOf(child), child)),
  );

const isExternalFile =
  (program: Program) =>
  (sourceFile: SourceFile): boolean =>
    !program.isSourceFileDefaultLibrary(sourceFile) &&
    (Str.includes(NODE_MODULES_SEGMENT)(sourceFile.fileName) ||
      program.isSourceFileFromExternalLibrary(sourceFile));

export const isExternalDeclaration =
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

export const declarationsOf = (symbol: TypeSymbol): readonly Declaration[] =>
  pipe(
    symbol.declarations,
    Arr.flatMap((handle) => Option.toArray(Option.fromUndefinedOr(handle.resolve()))),
  );

const isEntityName = (expression: Expression): boolean =>
  isIdentifier(expression) ||
  (isPropertyAccessExpression(expression) && isEntityName(expression.expression));

const aliasesAnEntity = (declaration: Node): boolean =>
  !isExportAssignment(declaration) || isEntityName(declaration.expression);

const isAliasDeclaration = (declaration: Node): boolean =>
  ALIAS_KINDS.has(declaration.kind) && aliasesAnEntity(declaration);

export const resolvedSymbol =
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

export const symbolAt =
  (checker: Checker) =>
  (node: Node): Option.Option<TypeSymbol> =>
    Option.fromUndefinedOr(checker.getSymbolAtLocation(node)).pipe(
      Option.map(resolvedSymbol(checker)),
    );

export const referencedSymbols =
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

export const lineOf = (node: Node): number => {
  const sourceFile = node.getSourceFile();
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + POSITION_BASE;
};

export const columnOf = (node: Node): number => {
  const sourceFile = node.getSourceFile();
  return (
    sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).character + POSITION_BASE
  );
};

export const contains =
  (outer: Node) =>
  (inner: Node): boolean =>
    outer.getSourceFile().fileName === inner.getSourceFile().fileName &&
    outer.getStart() <= inner.getStart() &&
    inner.getEnd() <= outer.getEnd();

export const isTypeDeclaration = (
  declaration: Node,
): declaration is TypeAliasDeclaration | InterfaceDeclaration | EnumDeclaration =>
  isTypeAliasDeclaration(declaration) ||
  isInterfaceDeclaration(declaration) ||
  isEnumDeclaration(declaration);

export const isGenericDeclaration = (declaration: Node): boolean =>
  (isTypeAliasDeclaration(declaration) || isInterfaceDeclaration(declaration)) &&
  Arr.isReadonlyArrayNonEmpty(declaration.typeParameters ?? []);

export const propertyNamesOf =
  (checker: Checker) =>
  (type: Type): readonly string[] =>
    pipe(
      checker.getPropertiesOfType(type),
      Arr.map((property) => property.name),
    );

const moduleSpecifierOf = (statement: Node): Option.Option<string> => {
  if (!isImportDeclaration(statement) && !isExportDeclaration(statement)) {
    return Option.none();
  }
  return Option.fromUndefinedOr(statement.moduleSpecifier).pipe(
    Option.filter((specifier) => isStringLiteral(specifier)),
    Option.map((specifier) => specifier.text),
  );
};

export const importedModulesOf = (sourceFile: SourceFile): readonly string[] =>
  pipe(
    sourceFile.statements,
    Arr.map((statement) => moduleSpecifierOf(statement)),
    Arr.getSomes,
  );
