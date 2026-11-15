import { Array, Effect, Match, Option, Predicate, pipe } from "effect";
import type { SchemaRepresentation } from "effect";

import { descriptionOf, field, lower, partsOf } from "./lower.ts";
import type { Field, Item, UnsupportedSchema, Variant } from "./types.ts";

type Representation = SchemaRepresentation.Representation;
type Objects = SchemaRepresentation.Objects;
type Built = Effect.Effect<Item, UnsupportedSchema>;

export type Named = readonly [string, Representation];

const MIN_VARIANTS = 2;

const resolve =
  (references: SchemaRepresentation.References) =>
  (representation: Representation): Representation =>
    Match.value(representation).pipe(
      Match.tag("Reference", ({ $ref }) =>
        pipe(
          Option.fromNullishOr(references[$ref]),
          Option.getOrElse(() => representation),
        ),
      ),
      Match.orElse(() => representation),
    );

const stringLiteral = (representation: Representation): Option.Option<string> =>
  Match.value(representation).pipe(
    Match.tag("Literal", ({ literal }) => Option.liftPredicate(literal, Predicate.isString)),
    Match.orElse(() => Option.none<string>()),
  );

const asObjects = (representation: Representation): Option.Option<Objects> =>
  Match.value(representation).pipe(
    Match.tag("Objects", (objects) =>
      Option.liftPredicate(objects, ({ indexSignatures }) =>
        Array.isReadonlyArrayEmpty(indexSignatures),
      ),
    ),
    Match.orElse(() => Option.none<Objects>()),
  );

const allSome = <Value>(
  options: readonly Option.Option<Value>[],
): Option.Option<readonly Value[]> => {
  const values = Array.getSomes(options);
  return Option.liftPredicate(values, (found) => found.length === options.length);
};

const tagValue =
  (key: string) =>
  (objects: Objects): Option.Option<string> =>
    pipe(
      objects.propertySignatures,
      Array.findFirst(({ name }) => name === key),
      Option.flatMap(({ type }) => stringLiteral(type)),
    );

const distinctTags =
  (members: readonly Objects[]) =>
  (key: string): boolean => {
    const tags = pipe(members, Array.map(tagValue(key)));
    return pipe(
      allSome(tags),
      Option.exists((values) => new Set(values).size === values.length),
    );
  };

const discriminator = (members: readonly Objects[]): Option.Option<string> =>
  pipe(
    Array.head(members),
    Option.filter(() => members.length >= MIN_VARIANTS),
    Option.flatMap(({ propertySignatures }) =>
      pipe(
        propertySignatures,
        Array.map(({ name }) => name),
        Array.filter(Predicate.isString),
        Array.findFirst(distinctTags(members)),
      ),
    ),
  );

const fieldsOf =
  (path: string, skip: Option.Option<string>) =>
  (objects: Objects): Effect.Effect<readonly Field[], UnsupportedSchema> =>
    pipe(
      objects.propertySignatures,
      Array.filter(({ name }) => !Option.contains(skip, name)),
      Effect.forEach(field(path)),
    );

const variantOf =
  (path: string, tag: string) =>
  (member: Objects): Effect.Effect<Variant, UnsupportedSchema> =>
    pipe(
      fieldsOf(path, Option.some(tag))(member),
      Effect.map((fields) => ({
        value: pipe(
          tagValue(tag)(member),
          Option.getOrElse(() => tag),
        ),
        doc: descriptionOf(member),
        fields,
      })),
    );

const alias = ([name, representation]: Named): Built =>
  pipe(
    lower(name)(representation),
    Effect.map((ty) => ({ _tag: "Alias", name, doc: descriptionOf(representation), ty }) as const),
  );

const tagged =
  ([name, representation]: Named) =>
  (members: readonly Objects[]): Option.Option<Built> =>
    pipe(
      discriminator(members),
      Option.map((tag) =>
        pipe(
          members,
          Effect.forEach(variantOf(name, tag)),
          Effect.map((variants): Item => ({
            _tag: "Tagged",
            name,
            doc: descriptionOf(representation),
            tag,
            variants,
          })),
        ),
      ),
    );

const enumeration =
  ([name, representation]: Named) =>
  (values: readonly Option.Option<string>[]): Option.Option<Built> =>
    pipe(
      allSome(values),
      Option.filter(Array.isReadonlyArrayNonEmpty),
      Option.map((literals) =>
        Effect.succeed<Item>({
          _tag: "Enumeration",
          name,
          doc: descriptionOf(representation),
          values: literals,
        }),
      ),
    );

const unionItem =
  (references: SchemaRepresentation.References) =>
  (entry: Named): Built => {
    const [, representation] = entry;
    const { members, nullable, undefinable } = partsOf(representation);
    const resolved = pipe(members, Array.map(resolve(references)));
    const objects = allSome(pipe(resolved, Array.map(asObjects)));
    const literals = pipe(members, Array.map(stringLiteral));
    const asTagged = (): Option.Option<Built> => pipe(objects, Option.flatMap(tagged(entry)));
    return pipe(
      Option.liftPredicate(members, () => !nullable && !undefinable),
      Option.flatMap(() => pipe(enumeration(entry)(literals), Option.orElse(asTagged))),
      Option.getOrElse(() => alias(entry)),
    );
  };

const enumItem =
  (entry: Named) =>
  ({ enums }: SchemaRepresentation.Enum): Built => {
    const values = pipe(
      enums,
      Array.map(([, value]) => Option.liftPredicate(value, Predicate.isString)),
    );
    return pipe(
      enumeration(entry)(values),
      Option.getOrElse(() => alias(entry)),
    );
  };

const structItem = (entry: Named): Built => {
  const [name, representation] = entry;
  return pipe(
    asObjects(representation),
    Option.match({
      onNone: () => alias(entry),
      onSome: (objects) =>
        pipe(
          fieldsOf(name, Option.none())(objects),
          Effect.map((fields): Item => ({
            _tag: "Struct",
            name,
            doc: descriptionOf(representation),
            fields,
          })),
        ),
    }),
  );
};

export const itemOf =
  (references: SchemaRepresentation.References) =>
  (entry: Named): Built => {
    const [, representation] = entry;
    return Match.value(representation).pipe(
      Match.tag("Union", () => unionItem(references)(entry)),
      Match.tag("Enum", enumItem(entry)),
      Match.orElse(() => structItem(entry)),
    );
  };
