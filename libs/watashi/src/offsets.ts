import type { FileParams } from "@masseater.dev/watashi-protocol";
import { Effect, FileSystem, Option, Path, Schema, String as Str } from "effect";
import type { PlatformError } from "effect";

type Saved = Readonly<{ home: string; key: FileParams }>;

const Offsets = Schema.fromJsonString(Schema.Record(Schema.String, Schema.Int));

const decodeOffsets = Schema.decodeUnknownOption(Offsets);

const encodeOffsets = Schema.encodeEffect(Offsets);

const safe = Str.replaceAll(/[^\w.-]/gu, "_");

const offsetsFile = ({ home, key }: Saved): Effect.Effect<string, never, Path.Path> =>
  Effect.service(Path.Path).pipe(
    Effect.map((path) => path.join(home, "offsets", safe(key.kind), `${safe(key.session)}.json`)),
  );

const readOffsets = (
  file: string,
): Effect.Effect<Readonly<Record<string, number>>, never, FileSystem.FileSystem> =>
  Effect.gen(function* read() {
    const fs = yield* FileSystem.FileSystem;
    const text = yield* Effect.option(fs.readFileString(file));
    return text.pipe(
      Option.flatMap(decodeOffsets),
      Option.getOrElse(() => ({})),
    );
  });

const savedOffset = (
  saved: Saved,
): Effect.Effect<Option.Option<number>, never, FileSystem.FileSystem | Path.Path> =>
  offsetsFile(saved).pipe(
    Effect.flatMap(readOffsets),
    Effect.map((offsets) => Option.fromNullishOr(offsets[saved.key.file])),
  );

const saveOffset = (
  saved: Saved & Readonly<{ offset: number }>,
): Effect.Effect<
  void,
  PlatformError.PlatformError | Schema.SchemaError,
  FileSystem.FileSystem | Path.Path
> =>
  Effect.gen(function* save() {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const target = yield* offsetsFile(saved);
    const directory = path.dirname(target);
    yield* fs.makeDirectory(directory, { recursive: true });
    const current = yield* readOffsets(target);
    const next = yield* encodeOffsets({ ...current, [saved.key.file]: saved.offset });
    const temp = yield* fs.makeTempFile({ directory, prefix: ".offsets-" });
    yield* fs.writeFileString(temp, next);
    yield* fs.rename(temp, target);
  });

/** @internal */
export { saveOffset, savedOffset };
/** @internal */
export type { Saved };
