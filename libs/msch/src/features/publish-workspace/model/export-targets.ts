import {
  Array as Arr,
  Effect,
  FileSystem,
  Option,
  Path,
  Predicate,
  Record as Rec,
  Schema,
  String as Str,
  pipe,
} from "effect";

const PATTERN = "*";
const MANIFEST_FILE = "package.json";

const taggedError = Schema.TaggedError;

/** @internal */
export class MissingExportTargets extends taggedError<
  MissingExportTargets,
  { readonly brand: unique symbol }
>()("MissingExportTargets", { message: Schema.String }) {}

const AnyExports = Schema.optionalKey(Schema.Unknown);
const PublishConfig = Schema.Struct({ exports: AnyExports });

const PublishedExports = Schema.fromJsonString(
  Schema.Struct({ exports: AnyExports, publishConfig: Schema.optionalKey(PublishConfig) }),
);

type PublishedManifest = typeof PublishedExports.Type;

const singleTarget = (target: string): readonly string[] => {
  if (Str.includes(PATTERN)(target)) {
    return [];
  }
  return [target];
};

/** @internal */
export const exportTargetsOf = (exports: unknown): readonly string[] => {
  if (Predicate.isString(exports)) {
    return singleTarget(exports);
  }
  if (Arr.isArray(exports)) {
    return pipe(
      exports,
      Arr.flatMap((entry) => exportTargetsOf(entry)),
    );
  }
  if (Predicate.isReadonlyObject(exports)) {
    return pipe(
      Rec.values(exports),
      Arr.flatMap((entry) => exportTargetsOf(entry)),
    );
  }
  return [];
};

const publishedExportsOf = (manifest: PublishedManifest): unknown =>
  pipe(
    Option.fromUndefinedOr(manifest.publishConfig),
    Option.flatMap((config) => Option.fromUndefinedOr(config.exports)),
    Option.orElse(() => Option.fromUndefinedOr(manifest.exports)),
    Option.getOrUndefined,
  );

const missingMessage = (missing: readonly string[]): string =>
  `The published exports point to files the build did not write: ${Arr.join(missing, ", ")}`;

/** @internal */
export const checkExportTargets = Effect.fn("publish.checkExportTargets")(
  function* checkExportTargets(directory: string) {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const manifest = yield* fileSystem
      .readFileString(path.join(directory, MANIFEST_FILE))
      .pipe(Effect.flatMap(Schema.decodeEffect(PublishedExports)));
    const missing = yield* Effect.filter(exportTargetsOf(publishedExportsOf(manifest)), (target) =>
      Effect.map(fileSystem.exists(path.join(directory, target)), (found) => !found),
    );
    return yield* pipe(
      missing,
      Arr.match({
        onEmpty: () => Effect.void,
        onNonEmpty: (list) =>
          Effect.fail(MissingExportTargets.make({ message: missingMessage(list) })),
      }),
    );
  },
);
