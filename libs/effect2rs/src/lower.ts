import { Array, Effect, Match, Option, Predicate, pipe } from "effect";
import type { SchemaRepresentation } from "effect";

import { numberType } from "./integer.ts";
import { fieldIdentifier, snakeCase } from "./names.ts";
import {
  UnsupportedSchema,
  boxed,
  dictionary,
  json,
  list,
  named,
  optional,
  prim,
  tuple,
} from "./types.ts";
import type { Field, Ty } from "./types.ts";

type Representation = SchemaRepresentation.Representation;

export type Lowered = Effect.Effect<Ty, UnsupportedSchema>;

const SINGLE = 1;

const refuse =
  (path: string) =>
  (reason: string): Lowered =>
    Effect.fail(UnsupportedSchema.make({ path, reason }));

const isNull = (representation: Representation): boolean =>
  Predicate.isTagged(representation, "Null");

const isUndefined = (representation: Representation): boolean =>
  Predicate.isTagged(representation, "Undefined") || Predicate.isTagged(representation, "Void");

const isAbsent = (representation: Representation): boolean =>
  isNull(representation) || isUndefined(representation);

export interface Parts {
  readonly members: readonly SchemaRepresentation.Representation[];
  readonly nullable: boolean;
  readonly undefinable: boolean;
}

export const partsOf = (representation: SchemaRepresentation.Representation): Parts =>
  Match.value(representation).pipe(
    Match.tag("Union", ({ types }) => ({
      members: pipe(types, Array.filter(Predicate.not(isAbsent))),
      nullable: pipe(types, Array.some(isNull)),
      undefinable: pipe(types, Array.some(isUndefined)),
    })),
    Match.orElse(() => ({ members: [representation], nullable: false, undefinable: false })),
  );

const wrapOptional = (ty: Ty): Ty =>
  Match.value(ty).pipe(
    Match.tag("Optional", () => ty),
    Match.orElse(() => optional(ty)),
  );

const optionalWhen =
  (absent: boolean) =>
  (ty: Ty): Ty =>
    Match.value(absent).pipe(
      Match.when(true, () => wrapOptional(ty)),
      Match.orElse(() => ty),
    );

const literal =
  (path: string) =>
  (value: string | number | boolean | bigint): Lowered =>
    Match.value(value).pipe(
      Match.when(Predicate.isString, () => Effect.succeed(prim("String"))),
      Match.when(Predicate.isBoolean, () => Effect.succeed(prim("bool"))),
      Match.when(Number.isInteger, () => Effect.succeed(prim("i64"))),
      Match.when(Predicate.isNumber, () => Effect.succeed(prim("f64"))),
      Match.orElse(() => refuse(path)("bigint literals have no JSON form")),
    );

export type Lower = (
  path: string,
) => (representation: SchemaRepresentation.Representation) => Lowered;

const UNION_REASON =
  "only an identified union of string literals, or of structs sharing a literal tag, becomes a Rust enum";

const union =
  (path: string, lower: Lower) =>
  (representation: Representation): Lowered => {
    const { members, nullable, undefinable } = partsOf(representation);
    return pipe(
      Option.liftPredicate(members, (all) => all.length === SINGLE),
      Option.flatMap(Array.head),
      Option.match({
        onNone: () => refuse(path)(UNION_REASON),
        onSome: (only) =>
          pipe(lower(path)(only), Effect.map(optionalWhen(nullable || undefinable))),
      }),
    );
  };

const objects =
  (path: string, lower: Lower) =>
  (object: SchemaRepresentation.Objects): Lowered =>
    pipe(
      Array.head(object.indexSignatures),
      Option.filter(() => Array.isReadonlyArrayEmpty(object.propertySignatures)),
      Option.match({
        onNone: () => refuse(path)("a struct needs an identifier"),
        onSome: ({ parameter, type }) =>
          pipe(
            Effect.all([lower(`${path}[key]`)(parameter), lower(`${path}[]`)(type)]),
            Effect.map(dictionary),
          ),
      }),
    );

const isList = ({ elements, rest }: SchemaRepresentation.Arrays): boolean =>
  Array.isReadonlyArrayEmpty(elements) && rest.length === SINGLE;

const isTuple = ({ elements, rest }: SchemaRepresentation.Arrays): boolean =>
  Array.isReadonlyArrayEmpty(rest) && Array.isReadonlyArrayNonEmpty(elements);

const arrays =
  (path: string, lower: Lower) =>
  (array: SchemaRepresentation.Arrays): Lowered =>
    Match.value(array).pipe(
      Match.when(isList, ({ rest }) =>
        pipe(
          Array.head(rest),
          Option.match({
            onNone: () => refuse(path)("an array needs an element type"),
            onSome: (element) => pipe(lower(`${path}[]`)(element), Effect.map(list)),
          }),
        ),
      ),
      Match.when(isTuple, ({ elements }) =>
        pipe(
          elements,
          Effect.forEach(({ type }, index) => lower(`${path}[${index}]`)(type)),
          Effect.map(tuple),
        ),
      ),
      Match.orElse(() => refuse(path)("only arrays and fixed tuples are supported")),
    );

export const lower: Lower = (path) => (representation) =>
  Match.value(representation).pipe(
    Match.tagsExhaustive({
      Reference: ({ $ref }) => Effect.succeed(named($ref)),
      String: () => Effect.succeed(prim("String")),
      TemplateLiteral: () => Effect.succeed(prim("String")),
      Boolean: () => Effect.succeed(prim("bool")),
      Number: ({ checks }) => Effect.succeed(prim(numberType(checks))),
      Unknown: () => Effect.succeed(json),
      Any: () => Effect.succeed(json),
      ObjectKeyword: () => Effect.succeed(json),
      Literal: ({ literal: value }) => literal(path)(value),
      Suspend: ({ thunk }) => pipe(lower(path)(thunk), Effect.map(boxed)),
      Union: union(path, lower),
      Objects: objects(path, lower),
      Arrays: arrays(path, lower),
      Enum: () => refuse(path)("an enum needs an identifier"),
      Declaration: () => refuse(path)("a declaration has no wire form"),
      Null: () => refuse(path)("null alone has no Rust type"),
      Undefined: () => refuse(path)("undefined alone has no Rust type"),
      Void: () => refuse(path)("void has no Rust type"),
      Never: () => refuse(path)("never has no Rust type"),
      BigInt: () => refuse(path)("bigint has no JSON form"),
      Symbol: () => refuse(path)("symbol has no JSON form"),
      UniqueSymbol: () => refuse(path)("symbol has no JSON form"),
    }),
  );

export const descriptionOf = (value: unknown): Option.Option<string> =>
  pipe(
    Option.liftPredicate(value, Predicate.hasProperty("annotations")),
    Option.flatMapNullishOr(({ annotations }) => annotations),
    Option.filter(Predicate.isObject),
    Option.flatMapNullishOr((annotations) => Reflect.get(annotations, "description")),
    Option.filter(Predicate.isString),
  );

const fieldDescription = (
  signature: SchemaRepresentation.PropertySignature,
): Option.Option<string> =>
  pipe(
    descriptionOf(signature),
    Option.orElse(() => descriptionOf(signature.type)),
  );

const keyedField =
  (path: string, signature: SchemaRepresentation.PropertySignature) =>
  (key: string): Effect.Effect<Field, UnsupportedSchema> => {
    const { nullable, undefinable } = partsOf(signature.type);
    const absent = signature.isOptional || undefinable;
    return pipe(
      lower(`${path}.${key}`)(signature.type),
      Effect.map((ty) => ({
        rust: fieldIdentifier(snakeCase(key)),
        key,
        ty: optionalWhen(absent)(ty),
        skipNone: absent && !nullable,
        doc: fieldDescription(signature),
      })),
    );
  };

export const field =
  (path: string) =>
  (signature: SchemaRepresentation.PropertySignature): Effect.Effect<Field, UnsupportedSchema> =>
    pipe(
      Option.liftPredicate(signature.name, Predicate.isString),
      Option.match({
        onNone: () =>
          Effect.fail(
            UnsupportedSchema.make({ path, reason: "only string keys can become Rust fields" }),
          ),
        onSome: keyedField(path, signature),
      }),
    );
