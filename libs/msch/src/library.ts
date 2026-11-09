import { Array as Arr, Option, pipe } from "effect";

import { InternalSymbolName, isModuleDeclaration, isVariableDeclaration } from "./compiler.ts";
import type { Checker, Declaration, TypeSymbol, Type } from "./compiler.ts";
import type { DependencyEntry } from "./dependencies.ts";
import {
  declarationsOf,
  isGenericDeclaration,
  isTypeDeclaration,
  resolvedSymbol,
} from "./syntax.ts";
import { schemaTypeOf, vocabularyOf } from "./values.ts";
import type { Vocabulary } from "./values.ts";

interface LibraryType {
  readonly specifier: string;
  readonly typeName: string;
  readonly declaration: Declaration;
}

interface LibraryVocabulary extends LibraryType {
  readonly vocabulary: Vocabulary;
}

interface LibraryShape extends LibraryType {
  readonly type: Type;
}

interface LibraryIndex {
  readonly vocabularies: readonly LibraryVocabulary[];
  readonly shapes: readonly LibraryShape[];
}

interface Walk {
  readonly checker: Checker;
  readonly entry: DependencyEntry;
}

interface Visit {
  readonly exported: TypeSymbol;
  readonly qualifier: string;
  readonly ancestors: readonly TypeSymbol[];
}

interface Exported {
  readonly symbol: TypeSymbol;
  readonly typeName: string;
}

const NAMESPACE_DEPTH_LIMIT = 8;
const EMPTY_INDEX: LibraryIndex = { vocabularies: [], shapes: [] };

const isObjectType =
  (checker: Checker) =>
  (type: Type): boolean =>
    !type.isUnionType() &&
    !type.isLiteralType() &&
    checker.getApparentType(type).id === type.id &&
    Arr.isReadonlyArrayNonEmpty(checker.getPropertiesOfType(type));

const describeLibraryType = (type: LibraryType): string =>
  `${type.typeName} from ${type.specifier}`;

const libraryType = (walk: Walk, typeName: string, declaration: Declaration): LibraryType => ({
  specifier: walk.entry.specifier,
  typeName,
  declaration,
});

const declaredTypeIndex = (walk: Walk, exported: Exported): LibraryIndex => {
  const declaration = Arr.findFirst(declarationsOf(exported.symbol), isTypeDeclaration);
  if (Option.isNone(declaration) || isGenericDeclaration(declaration.value)) {
    return EMPTY_INDEX;
  }
  const located = libraryType(walk, exported.typeName, declaration.value);
  const type = walk.checker.getDeclaredTypeOfSymbol(exported.symbol);
  const vocabularies = vocabularyOf(walk.checker)(type).pipe(
    Option.map((vocabulary) => ({ ...located, vocabulary })),
    Option.toArray,
  );
  const shapes = Arr.filter([{ ...located, type }], () => isObjectType(walk.checker)(type));
  return { vocabularies, shapes };
};

const schemaTypeIndex = (walk: Walk, located: LibraryType, schemaType: Type): LibraryIndex => ({
  vocabularies: vocabularyOf(walk.checker)(schemaType).pipe(
    Option.map((vocabulary) => ({ ...located, vocabulary })),
    Option.toArray,
  ),
  shapes: Arr.filter([{ ...located, type: schemaType }], () =>
    isObjectType(walk.checker)(schemaType),
  ),
});

const schemaValueIndex = (walk: Walk, exported: Exported): LibraryIndex => {
  const declaration = Arr.findFirst(declarationsOf(exported.symbol), isVariableDeclaration);
  if (Option.isNone(declaration)) {
    return EMPTY_INDEX;
  }
  const valueType = walk.checker.getTypeOfSymbolAtLocation(exported.symbol, declaration.value);
  const located = libraryType(walk, `(typeof ${exported.typeName})["Type"]`, declaration.value);
  return Option.match(schemaTypeOf(walk.checker)(valueType), {
    onNone: () => EMPTY_INDEX,
    onSome: (schemaType) => schemaTypeIndex(walk, located, schemaType),
  });
};

const mergeIndexes = (indexes: readonly LibraryIndex[]): LibraryIndex => ({
  vocabularies: pipe(
    indexes,
    Arr.flatMap((index) => index.vocabularies),
  ),
  shapes: pipe(
    indexes,
    Arr.flatMap((index) => index.shapes),
  ),
});

const isNamespace = (symbol: TypeSymbol): boolean =>
  pipe(
    declarationsOf(symbol),
    Arr.some((declaration) => isModuleDeclaration(declaration)),
  );

const indexUnder = (walk: Walk, visit: Visit): LibraryIndex => {
  const symbol = resolvedSymbol(walk.checker)(visit.exported);
  const named = { symbol, typeName: `${visit.qualifier}${visit.exported.name}` };
  const own = mergeIndexes([declaredTypeIndex(walk, named), schemaValueIndex(walk, named)]);
  if (
    !isNamespace(symbol) ||
    visit.ancestors.length >= NAMESPACE_DEPTH_LIMIT ||
    visit.ancestors.includes(symbol)
  ) {
    return own;
  }
  const nested = pipe(
    walk.checker.getExportsOfModule(symbol),
    Arr.map((member) =>
      indexUnder(walk, {
        exported: member,
        qualifier: `${named.typeName}.`,
        ancestors: [...visit.ancestors, symbol],
      }),
    ),
  );
  return mergeIndexes([own, ...nested]);
};

const exportAssignmentOf = (moduleSymbol: TypeSymbol): Option.Option<TypeSymbol> =>
  Option.fromUndefinedOr(moduleSymbol.getExports().get(InternalSymbolName.ExportEquals));

const indexOfEntry =
  (checker: Checker) =>
  (entry: DependencyEntry): LibraryIndex => {
    const moduleSymbol = Option.fromUndefinedOr(
      checker.getSymbolOfSourceFile(entry.declarationsPath),
    );
    if (Option.isNone(moduleSymbol)) {
      return EMPTY_INDEX;
    }
    const walk: Walk = { checker, entry };
    const roots = Option.match(exportAssignmentOf(moduleSymbol.value), {
      onNone: () => checker.getExportsOfModule(moduleSymbol.value),
      onSome: (assigned) => [resolvedSymbol(checker)(assigned)],
    });
    return mergeIndexes(
      pipe(
        roots,
        Arr.map((exported) => indexUnder(walk, { exported, qualifier: "", ancestors: [] })),
      ),
    );
  };

const libraryIndex =
  (checker: Checker) =>
  (entries: readonly DependencyEntry[]): LibraryIndex =>
    mergeIndexes(
      pipe(
        entries,
        Arr.map((entry) => indexOfEntry(checker)(entry)),
      ),
    );

export { describeLibraryType, isObjectType, libraryIndex };
export type { LibraryIndex, LibraryShape, LibraryType, LibraryVocabulary };
