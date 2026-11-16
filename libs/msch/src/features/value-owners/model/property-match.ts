import { Array as Arr, pipe } from "effect";

import type { LibraryShape } from "#/entities/project/index.ts";
import type { Checker, Type, TypeSymbol } from "#/shared/lib/compiler.ts";
import { declarationsOf, packageOf } from "#/shared/lib/syntax.ts";

export interface OpenTypeIds {
  readonly any: number;
  readonly unknown: number;
}

export const openTypeIdsOf = (checker: Checker): OpenTypeIds => ({
  any: checker.getAnyType().id,
  unknown: checker.getUnknownType().id,
});

export interface PropertyContext {
  readonly checker: Checker;
  readonly open: OpenTypeIds;
}

export const sameProperty =
  ({ checker, open }: PropertyContext) =>
  (localType: Type, library: TypeSymbol): boolean => {
    const libraryType = checker.getTypeOfSymbol(library);
    return (
      libraryType.id !== open.any &&
      libraryType.id !== open.unknown &&
      checker.isTypeAssignableTo(localType, libraryType) &&
      checker.isTypeAssignableTo(libraryType, localType)
    );
  };

export const declaredBy =
  (shape: LibraryShape) =>
  (library: TypeSymbol): boolean => {
    const owner = packageOf(shape.declaration.file);
    return pipe(
      declarationsOf(library),
      Arr.some((declaration) => packageOf(declaration.getSourceFile().fileName) === owner),
    );
  };
