import {
  Array,
  Effect,
  Option,
  Predicate,
  Record,
  Schema,
  SchemaAST,
  SchemaRepresentation,
  pipe,
} from "effect";

import { itemOf, UnsupportedSchema } from "#/entities/rust-item/index.ts";
import type { Constant } from "#/entities/rust-item/index.ts";
import { copiesOf, handWrittenCopies, staleRust } from "#/features/check-rust/index.ts";
import type { RustFile } from "#/features/check-rust/index.ts";
import { render } from "#/features/render-rust/index.ts";

export { UnsupportedSchema } from "#/entities/rust-item/index.ts";
export { StaleRust } from "#/features/check-rust/index.ts";
export { HandWrittenCopies } from "#/features/check-rust/index.ts";
export type { RustFile } from "#/features/check-rust/index.ts";

export interface Effect2rsInput {
  readonly definitions: Readonly<Record<string, unknown>>;
  readonly header: string;
  readonly derive?: readonly string[];
}

const isConstant = Predicate.or(
  Predicate.isString,
  Predicate.or(Predicate.isNumber, Predicate.isBoolean),
);

const NAMED_BY_EXPORT: readonly Predicate.Predicate<SchemaAST.AST>[] = [
  SchemaAST.isObjects,
  SchemaAST.isUnion,
  SchemaAST.isEnum,
  SchemaAST.isDeclaration,
  SchemaAST.isArrays,
  SchemaAST.isSuspend,
];

const namedByExport: Predicate.Predicate<SchemaAST.AST> = (ast) =>
  pipe(
    NAMED_BY_EXPORT,
    Array.some((guard) => guard(ast)),
  );

const isGenerated: Predicate.Predicate<SchemaAST.AST> = (ast) =>
  namedByExport(ast) || Predicate.isString(SchemaAST.resolveIdentifier(ast));

const constantOf = ([key, value]: readonly [string, unknown]): Effect.Effect<
  Constant,
  UnsupportedSchema
> =>
  pipe(
    Option.liftPredicate(value, isConstant),
    Option.match({
      onNone: () =>
        Effect.fail(
          UnsupportedSchema.make({
            path: key,
            reason: "exports must be schemas, strings, numbers, or booleans",
          }),
        ),
      onSome: (constant) => Effect.succeed({ name: key, value: constant }),
    }),
  );

interface Document {
  readonly references: SchemaRepresentation.References;
  readonly chosen: ReadonlySet<string>;
}

const schemasOf = (
  definitions: Readonly<Record<string, unknown>>,
): readonly (readonly [string, Schema.Top])[] =>
  pipe(
    Record.toEntries(definitions),
    Array.filter((entry): entry is [string, Schema.Top] => {
      const [, value] = entry;
      return Schema.isSchema(value);
    }),
  );

const documentOf = (definitions: Readonly<Record<string, unknown>>): Document => {
  const schemas = schemasOf(definitions);
  const exported = new Map(
    pipe(
      schemas,
      Array.filter(([, schema]) => namedByExport(schema.ast)),
      Array.map(([key, schema]) => [schema.ast, key] as const),
    ),
  );
  const chosen = new Set<string>();
  const policy: SchemaRepresentation.ReferencePolicy = ({ ast, identifier }) =>
    pipe(
      Option.fromNullishOr(identifier),
      Option.orElse(() => Option.fromNullishOr(exported.get(ast))),
      Option.tap((name) => Option.some(chosen.add(name))),
      Option.getOrUndefined,
    );
  const references = pipe(
    schemas,
    Array.map(([, schema]) => schema.ast),
    Array.filter(isGenerated),
    Array.match({
      onEmpty: (): SchemaRepresentation.References => ({}),
      onNonEmpty: (asts) =>
        SchemaRepresentation.toRepresentations(asts, { referencePolicy: policy }).references,
    }),
  );
  return { references, chosen };
};

const renamed = (name: string): UnsupportedSchema =>
  UnsupportedSchema.make({
    path: name,
    reason: "another schema has the same name, or a recursive schema has no identifier",
  });

export const effect2rs = Effect.fn("effect2rs")(function* effect2rs(input: Effect2rsInput) {
  const constants = yield* pipe(
    Record.toEntries(input.definitions),
    Array.filter(([, value]) => !Schema.isSchema(value)),
    Effect.forEach(constantOf),
  );
  const { references, chosen } = documentOf(input.definitions);
  const named = Record.toEntries(references);
  yield* pipe(
    named,
    Array.findFirst(([name]) => !chosen.has(name)),
    Option.match({
      onNone: () => Effect.void,
      onSome: ([name]) => Effect.fail(renamed(name)),
    }),
  );
  const items = yield* pipe(named, Effect.forEach(itemOf(references)));
  return render({ header: input.header, derive: input.derive ?? [], items, constants });
});

export interface RustCheck extends Effect2rsInput {
  readonly path: string;
  readonly current: Option.Option<string>;
  readonly siblings: readonly RustFile[];
}

export const checkRust = Effect.fn("effect2rs.checkRust")(function* checkRust(check: RustCheck) {
  const source = yield* effect2rs(check);
  yield* pipe(
    check.current,
    Option.filter((current) => current === source),
    Option.match({
      onNone: () => Effect.fail(staleRust(check.path)),
      onSome: () => Effect.void,
    }),
  );
  return yield* pipe(
    copiesOf(source)(check.siblings),
    Array.match({
      onEmpty: () => Effect.void,
      onNonEmpty: (copies) => Effect.fail(handWrittenCopies(copies)),
    }),
  );
});
