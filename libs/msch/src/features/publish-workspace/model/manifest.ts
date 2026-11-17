import { Effect, FileSystem, Option, Path, Schema, String as Str, pipe } from "effect";

const MANIFEST_FILE = "package.json";
const SCOPE = /^@[^/]+\//u;
const UNVERSIONED = "0.0.0";
const ROOT = ".";

const Native = Schema.Struct({ binary: Schema.String, targets: Schema.Array(Schema.String) });

const ManifestSchema = Schema.Struct({
  name: Schema.String,
  version: Schema.String,
  private: Schema.optionalKey(Schema.Boolean),
  native: Schema.optionalKey(Native),
  "size-limit": Schema.optionalKey(Schema.Unknown),
});

/** @internal */
export type Manifest = typeof ManifestSchema.Type;

/** @internal */
export const manifestIn = Effect.fn("publish.manifest")(function* manifestIn(directory: string) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const text = yield* fileSystem.readFileString(path.join(directory, MANIFEST_FILE));
  return yield* Schema.decodeEffect(Schema.fromJsonString(ManifestSchema))(text);
});

/** @internal */
export const releaseName = ({ name }: Pick<Manifest, "name">): string =>
  Str.replace(SCOPE, "")(name);

/** @internal */
export const isRoot = (directory: string): boolean => directory === ROOT;

/** @internal */
export interface Tagged extends Pick<Manifest, "name" | "version"> {
  readonly directory: string;
}

/** @internal */
export const tagOf = ({ directory, name, version }: Tagged): string => {
  if (isRoot(directory)) {
    return `v${version}`;
  }
  return `${releaseName({ name })}-v${version}`;
};

/** @internal */
export const environmentOf = (manifest: Pick<Manifest, "name">): string =>
  `${releaseName(manifest)}-release`;

/** @internal */
export const isVersioned = ({ version }: Pick<Manifest, "version">): boolean =>
  version !== UNVERSIONED;

/** @internal */
export const goesToNpm = (manifest: Pick<Manifest, "private">): boolean =>
  !pipe(
    Option.fromUndefinedOr(manifest.private),
    Option.getOrElse(() => false),
  );
