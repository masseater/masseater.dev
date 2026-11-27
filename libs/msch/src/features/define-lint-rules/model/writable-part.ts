import { Array as Arr, Option, String as Str, pipe } from "effect";
import type { Checker, Project, Symbol as TypeSymbol, Type } from "typescript/sync";

import { originOf, readonlyFormOf } from "./declared-outside.ts";
import type { Origin } from "./declared-outside.ts";

export type Mutability =
  | { readonly kind: "array" }
  | { readonly kind: "tuple" }
  | { readonly kind: "property" }
  | { readonly kind: "index" }
  | { readonly kind: "form"; readonly name: string; readonly readonlyName: string };

export interface WritablePart {
  readonly path: readonly string[];
  readonly mutability: Mutability;
}

type Found = Option.Option<WritablePart>;

interface Search {
  readonly project: Project;
  readonly partOf: (type: Type) => Found;
}

export const ELEMENT = "[]";

const MUTABLE_ARRAY = "Array";
const PRIVATE_NAME = "__#";
const SYMBOL_NAME = "__@";

const here = (mutability: Mutability): Found => Option.some({ path: [], mutability });

const under =
  (segment: string) =>
  (part: WritablePart): WritablePart => ({ ...part, path: [segment, ...part.path] });

const firstPart = (search: Search, types: readonly Type[]): Found =>
  pipe(types, Arr.findFirst(search.partOf));

const formOf =
  (project: Project) =>
  (name: string): Found =>
    pipe(
      readonlyFormOf(project)(name),
      Option.flatMap((readonlyName) => here({ kind: "form", name, readonlyName })),
    );

const isOpaqueAlias = (project: Project, type: Type): boolean =>
  pipe(
    Option.fromNullishOr(type.getAliasSymbol()),
    Option.exists((alias) => {
      const origin = originOf(project)(alias);
      return (
        origin === "package" ||
        (origin === "builtin" && Arr.isReadonlyArrayEmpty(type.getAliasTypeArguments()))
      );
    }),
  );

const isNamed = (type: Type): boolean =>
  type.isClassOrInterface() || (type.isTypeReference() && type.getTarget().isClassOrInterface());

const declaredOutside = (project: Project, type: Type): Option.Option<Found> =>
  pipe(
    Option.fromNullishOr(type.getSymbol()),
    Option.flatMap((symbol): Option.Option<Found> => {
      const origin = originOf(project)(symbol);
      if (origin === "package") {
        return Option.some(Option.none());
      }
      if (origin === "own" || !isNamed(type)) {
        return Option.none();
      }
      return Option.some(formOf(project)(symbol.name));
    }),
  );

const isOutside = (project: Project, type: Type): boolean =>
  isOpaqueAlias(project, type) ||
  (type.isObjectType() && Option.exists(declaredOutside(project, type), Option.isNone));

const sourceOf = (type: Type): Option.Option<Type> => {
  if (!type.isMappedType()) {
    return Option.none();
  }
  const template = type.getTemplateType();
  if (!template.isIndexedAccessType()) {
    return Option.none();
  }
  return Option.some(template.getObjectType());
};

const takenFromOutside =
  (project: Project) =>
  (type: Type): readonly string[] => {
    if (isOutside(project, type)) {
      return pipe(
        type.getProperties(),
        Arr.map((property) => property.name),
      );
    }
    if (type.isUnionType() || type.isIntersectionType()) {
      return pipe(type.getTypes(), Arr.flatMap(takenFromOutside(project)));
    }
    return pipe(
      sourceOf(type),
      Option.map(takenFromOutside(project)),
      Option.getOrElse((): readonly string[] => []),
    );
  };

const elementsPart = (search: Search, type: Type): Found => {
  if (!type.isTypeReference()) {
    return Option.none();
  }
  return pipe(
    firstPart(search, search.project.checker.getTypeArguments(type)),
    Option.map(under(ELEMENT)),
  );
};

const arrayPart = (search: Search, type: Type): Found => {
  const mutable = pipe(
    Option.fromNullishOr(type.getSymbol()),
    Option.exists((symbol) => symbol.name === MUTABLE_ARRAY),
  );
  if (mutable) {
    return here({ kind: "array" });
  }
  return elementsPart(search, type);
};

const tuplePart = (search: Search, type: Type): Found => {
  if (type.isTupleType() && !type.getTarget().readonly) {
    return here({ kind: "tuple" });
  }
  return elementsPart(search, type);
};

const named =
  (prefix: string) =>
  (property: TypeSymbol): boolean =>
    pipe(String(property.escapedName), Str.startsWith(prefix));

const isWritable =
  (checker: Checker) =>
  (property: TypeSymbol): boolean =>
    !checker.isReadonlySymbol(property) && !named(PRIVATE_NAME)(property);

const isStringNamed = (property: TypeSymbol): boolean =>
  !named(PRIVATE_NAME)(property) && !named(SYMBOL_NAME)(property);

const declaredIn =
  (project: Project, origin: Origin) =>
  (property: TypeSymbol): boolean =>
    originOf(project)(property) === origin;

const inheritedForm =
  (project: Project) =>
  (property: TypeSymbol): Found =>
    pipe(
      Option.fromNullishOr(property.getParent()),
      Option.flatMap((owner) => formOf(project)(owner.name)),
    );

const propertyTypesPart = (search: Search, properties: readonly TypeSymbol[]): Found => {
  const judged = pipe(properties, Arr.filter(isStringNamed));
  return pipe(
    Arr.zip(judged, search.project.checker.getTypeOfSymbol(judged)),
    Arr.findFirst(([property, type]) =>
      pipe(search.partOf(type), Option.map(under(property.name))),
    ),
  );
};

const indexPart = (search: Search, type: Type): Found =>
  pipe(
    type.getIndexInfos(),
    Arr.findFirst((info) => {
      if (!info.isReadonly) {
        return here({ kind: "index" });
      }
      return pipe(search.partOf(info.valueType), Option.map(under(ELEMENT)));
    }),
  );

const membersPart = (search: Search, type: Type): Found => {
  const { project } = search;
  const properties = type.getProperties();
  const taken = pipe(
    sourceOf(type),
    Option.map(takenFromOutside(project)),
    Option.getOrElse((): readonly string[] => []),
  );
  const own = pipe(
    properties,
    Arr.filter(
      (property) => declaredIn(project, "own")(property) && !Arr.contains(taken, property.name),
    ),
  );
  return pipe(
    own,
    Arr.findFirst(isWritable(project.checker)),
    Option.map((property): WritablePart => ({
      path: [property.name],
      mutability: { kind: "property" },
    })),
    Option.orElse(() =>
      pipe(
        properties,
        Arr.filter(declaredIn(project, "builtin")),
        Arr.findFirst(inheritedForm(project)),
      ),
    ),
    Option.orElse(() => propertyTypesPart(search, own)),
    Option.orElse(() => indexPart(search, type)),
  );
};

const isFunction = (type: Type): boolean =>
  Arr.isReadonlyArrayNonEmpty(type.getCallSignatures()) &&
  Arr.isReadonlyArrayEmpty(type.getProperties());

const objectPart = (search: Search, type: Type): Found => {
  if (isFunction(type)) {
    return Option.none();
  }
  if (search.project.checker.isArrayType(type)) {
    return arrayPart(search, type);
  }
  if (type.isTupleType()) {
    return tuplePart(search, type);
  }
  return pipe(
    declaredOutside(search.project, type),
    Option.getOrElse(() => membersPart(search, type)),
  );
};

const typePart = (search: Search, type: Type): Found => {
  if (isOpaqueAlias(search.project, type)) {
    return Option.none();
  }
  if (type.isUnionType() || type.isIntersectionType()) {
    return firstPart(search, type.getTypes());
  }
  if (type.isConditionalType()) {
    return firstPart(search, [type.getTrueType(), type.getFalseType()]);
  }
  if (!type.isObjectType()) {
    return Option.none();
  }
  return objectPart(search, type);
};

export const writablePartOf =
  (project: Project) =>
  (type: Type): Option.Option<WritablePart> => {
    const seen = new Set<Type>();
    const partOf = (inner: Type): Found => {
      if (seen.has(inner)) {
        return Option.none();
      }
      seen.add(inner);
      return typePart({ project, partOf }, inner);
    };
    return partOf(type);
  };
