import { Array as Arr, Effect, Record as Rec, Schema, String as Str, pipe } from "effect";
import type { Option } from "effect";

const KINDS = ["cloudflare", "github", "npm", "atproto", "shared"] as const;
const ONLY = "only";
const SEPARATOR = ",";

export type Kind = (typeof KINDS)[number];

export type Issued = Readonly<Record<string, unknown>>;

export type Issuance<Failure, Context> = Readonly<{
  kinds: readonly Kind[];
  issuers: Readonly<Record<Kind, Effect.Effect<Option.Option<Issued>, Failure, Context>>>;
}>;

const taggedError = Schema.TaggedError;

export class UnknownKind extends taggedError<UnknownKind, { readonly brand: unique symbol }>()(
  "UnknownKind",
  { names: Schema.Array(Schema.String) },
) {}

const isKnown = (name: string): boolean => Arr.contains(KINDS, name);

const narrowed = (names: readonly string[]): Effect.Effect<readonly Kind[], UnknownKind> => {
  const unknown = pipe(
    names,
    Arr.filter((name) => !isKnown(name)),
  );
  if (Arr.isReadonlyArrayNonEmpty(unknown)) {
    return Effect.fail(UnknownKind.make({ names: unknown }));
  }
  return Effect.succeed(
    pipe(
      KINDS,
      Arr.filter((kind) => Arr.contains(names, kind)),
    ),
  );
};

export const selectKinds = (
  query: Readonly<Pick<URLSearchParams, "getAll">>,
): Effect.Effect<readonly Kind[], UnknownKind> => {
  const names = pipe(query.getAll(ONLY), Arr.flatMap(Str.split(SEPARATOR)));
  if (Arr.isReadonlyArrayNonEmpty(names)) {
    return narrowed(names);
  }
  return Effect.succeed(KINDS);
};

const merged = (issued: readonly Option.Option<Issued>[]): Issued =>
  pipe(Arr.getSomes(issued), Arr.flatMap(Rec.toEntries), Rec.fromEntries);

export const issueKinds = <Failure, Context>({
  kinds,
  issuers,
}: Issuance<Failure, Context>): Effect.Effect<Issued, Failure, Context> =>
  pipe(
    kinds,
    Effect.forEach((kind) => issuers[kind]),
    Effect.map(merged),
  );
