import { Effect, Option, Record as Rec, Schema, pipe } from "effect";

import { FetchFailed, fetchText } from "./download.ts";

/** @internal */
export const REDIST = "https://developer.download.nvidia.com/compute/cuda/redist";

const Archive = Schema.Struct({ relative_path: Schema.String, sha256: Schema.String });

const Manifest = Schema.fromJsonString(Schema.Record(Schema.String, Schema.Unknown));

const Component = Schema.Record(Schema.String, Schema.Unknown);

/** @internal */
export type ArchiveEntry = typeof Archive.Type;

/** @internal */
export type CudaManifest = Readonly<Record<string, unknown>>;

/** @internal */
export const manifestOf = Effect.fn("cuda.manifest")(function* manifestOf(version: string) {
  const text = yield* fetchText(`${REDIST}/redistrib_${version}.json`);
  return yield* Schema.decodeEffect(Manifest)(text).pipe(
    Effect.mapError((cause) => FetchFailed.make({ message: cause.message })),
  );
});

/** @internal */
export interface ArchiveQuery {
  readonly manifest: CudaManifest;
  readonly name: string;
  readonly platform: string;
}

/** @internal */
export const archiveOf = ({
  manifest,
  name,
  platform,
}: ArchiveQuery): Effect.Effect<ArchiveEntry, FetchFailed> =>
  pipe(
    Rec.get(manifest, name),
    Option.flatMap(Schema.decodeUnknownOption(Component)),
    Option.flatMap((component) => Rec.get(component, platform)),
    Option.flatMap(Schema.decodeUnknownOption(Archive)),
    Effect.fromOption,
    Effect.mapError(() => FetchFailed.make({ message: `${name} has no ${platform} archive` })),
  );
