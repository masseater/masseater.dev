import {
  Array as Arr,
  Match,
  Option,
  Predicate,
  Record as Rec,
  Schema,
  String as Str,
  pipe,
} from "effect";

const BinField = Schema.Union([Schema.String, Schema.Record(Schema.String, Schema.String)]);

export const ManifestSchema = Schema.Struct({
  name: Schema.String,
  version: Schema.String,
  bin: Schema.optional(BinField),
  deprecated: Schema.optional(Schema.String),
});

export type Manifest = typeof ManifestSchema.Type;

export type PublishedBin = Readonly<{ name: string; version: string; bins: readonly string[] }>;

const unscoped = (name: string): string =>
  pipe(
    Str.split(name, "/"),
    Arr.last,
    Option.getOrElse(() => name),
  );

const binNamesOf = (manifest: Manifest): readonly string[] =>
  pipe(
    Option.fromNullishOr(manifest.bin),
    Option.map((bin) =>
      Match.value(bin).pipe(
        Match.when(Predicate.isString, () => [unscoped(manifest.name)]),
        Match.orElse((named) => Rec.keys(named)),
      ),
    ),
    Option.getOrElse((): readonly string[] => []),
  );

export const publishedBinOf = (manifest: Manifest): Option.Option<PublishedBin> =>
  pipe(
    Option.liftPredicate(binNamesOf(manifest), Arr.isReadonlyArrayNonEmpty),
    Option.filter(() => Option.isNone(Option.fromNullishOr(manifest.deprecated))),
    Option.map((bins) => ({ name: manifest.name, version: manifest.version, bins })),
  );
