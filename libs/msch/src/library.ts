import { Array as Arr, Effect, Option, pipe } from "effect";

import { InternalSymbolName, isModuleDeclaration, isVariableDeclaration } from "./compiler.ts";
import type { Checker, Declaration, Node, SyntaxKind, TypeSymbol, Type } from "./compiler.ts";
import type { DependencyEntry } from "./dependencies.ts";
import {
  declarationsOf,
  isGenericDeclaration,
  isTypeDeclaration,
  propertyNamesOf,
  resolvedSymbol,
} from "./syntax.ts";
import { schemaTypeOf, vocabularyOf } from "./values.ts";
import type { Vocabulary } from "./values.ts";

interface LibraryType {
  readonly specifier: string;
  readonly typeName: string;
}

interface LibraryVocabulary extends LibraryType {
  readonly vocabulary: Vocabulary;
}

interface DeclarationLocation {
  readonly file: string;
  readonly pos: number;
  readonly kind: SyntaxKind;
}

interface LibraryShape extends LibraryType {
  readonly form: "declared" | "schema";
  readonly declaration: DeclarationLocation;
  readonly propertyNames: readonly string[];
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

const locationOf = (declaration: Node): DeclarationLocation => ({
  file: declaration.getSourceFile().fileName,
  pos: declaration.pos,
  kind: declaration.kind,
});

const declarationKey = (location: DeclarationLocation): string =>
  `${location.file}#${String(location.pos)}#${String(location.kind)}`;

type ShapeSource = LibraryType & Pick<LibraryShape, "form">;

const shapeOf =
  (checker: Checker) =>
  (source: ShapeSource, declaration: Declaration, type: Type): readonly LibraryShape[] =>
    Arr.filter(
      [
        {
          ...source,
          declaration: locationOf(declaration),
          propertyNames: propertyNamesOf(checker)(type),
        },
      ],
      () => isObjectType(checker)(type),
    );

const declaredTypeIndex = (walk: Walk, exported: Exported): LibraryIndex => {
  const declaration = Arr.findFirst(declarationsOf(exported.symbol), isTypeDeclaration);
  if (Option.isNone(declaration) || isGenericDeclaration(declaration.value)) {
    return EMPTY_INDEX;
  }
  const located = { specifier: walk.entry.specifier, typeName: exported.typeName };
  const type = walk.checker.getDeclaredTypeOfSymbol(exported.symbol);
  const vocabularies = vocabularyOf(walk.checker)(type).pipe(
    Option.map((vocabulary) => ({ ...located, vocabulary })),
    Option.toArray,
  );
  const shapes = shapeOf(walk.checker)({ ...located, form: "declared" }, declaration.value, type);
  return { vocabularies, shapes };
};

const schemaTypeIndex =
  (walk: Walk, located: LibraryType) =>
  (declaration: Declaration, schemaType: Type): LibraryIndex => ({
    vocabularies: vocabularyOf(walk.checker)(schemaType).pipe(
      Option.map((vocabulary) => ({ ...located, vocabulary })),
      Option.toArray,
    ),
    shapes: shapeOf(walk.checker)({ ...located, form: "schema" }, declaration, schemaType),
  });

const schemaValueIndex = (walk: Walk, exported: Exported): LibraryIndex => {
  const declaration = Arr.findFirst(declarationsOf(exported.symbol), isVariableDeclaration);
  if (Option.isNone(declaration)) {
    return EMPTY_INDEX;
  }
  const valueType = walk.checker.getTypeOfSymbolAtLocation(exported.symbol, declaration.value);
  const located = {
    specifier: walk.entry.specifier,
    typeName: `(typeof ${exported.typeName})["Type"]`,
  };
  return Option.match(schemaTypeOf(walk.checker)(valueType), {
    onNone: () => EMPTY_INDEX,
    onSome: (schemaType) => schemaTypeIndex(walk, located)(declaration.value, schemaType),
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

interface CachedIndex {
  readonly index: LibraryIndex;
  readonly cached: boolean;
}

interface LibraryCache {
  readonly indexOf: (entry: DependencyEntry, compute: () => LibraryIndex) => CachedIndex;
}

const libraryCache = (): LibraryCache => {
  const indexes = new Map<string, LibraryIndex>();
  return {
    indexOf: (entry, compute) =>
      Option.match(Option.fromUndefinedOr(indexes.get(entry.declarationsPath)), {
        onSome: (index) => ({ index, cached: true }),
        onNone: () => {
          const index = compute();
          indexes.set(entry.declarationsPath, index);
          return { index, cached: false };
        },
      }),
  };
};

const indexEntry =
  (cache: LibraryCache) =>
  (checker: Checker) =>
  (entry: DependencyEntry): Effect.Effect<LibraryIndex> =>
    Effect.sync(() => cache.indexOf(entry, () => indexOfEntry(checker)(entry))).pipe(
      Effect.tap(({ index, cached }) =>
        Effect.annotateCurrentSpan({
          "msch.library.cached": cached,
          "msch.library.vocabularies": index.vocabularies.length,
          "msch.library.shapes": index.shapes.length,
        }),
      ),
      Effect.map(({ index }) => index),
      Effect.withSpan("indexLibraryEntry", {
        attributes: { "msch.library.specifier": entry.specifier },
      }),
    );

const libraryIndex =
  (cache: LibraryCache) =>
  (checker: Checker) =>
  (entries: readonly DependencyEntry[]): Effect.Effect<LibraryIndex> =>
    pipe(
      entries,
      Effect.forEach(indexEntry(cache)(checker)),
      Effect.map(mergeIndexes),
      Effect.withSpan("libraryIndex"),
    );

export {
  declarationKey,
  describeLibraryType,
  isObjectType,
  libraryCache,
  libraryIndex,
  locationOf,
};
export type {
  DeclarationLocation,
  LibraryCache,
  LibraryIndex,
  LibraryShape,
  LibraryType,
  LibraryVocabulary,
};
