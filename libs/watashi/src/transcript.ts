import { Array as Arr, Effect, FileSystem, Option, Path, String as Str, pipe } from "effect";
import type { PlatformError, Scope } from "effect";

type Chunk = Readonly<{ start: number; end: number; text: string }>;

type TranscriptFile = Readonly<{ file: string; path: string }>;

type Read = Readonly<{ path: string; start: number; maxBytes: number }>;

type Reader = (
  position: number,
  size: number,
) => Effect.Effect<Uint8Array, PlatformError.PlatformError>;

const MAX_CHUNK_BYTES = 2_097_152;
const NEWLINE = 10;
const NOT_FOUND = -1;
const ONE = 1;
const START = 0;
const SUBAGENT_SUFFIX = ".jsonl";

const decoder = new TextDecoder();

const readerOf = (
  path: string,
): Effect.Effect<
  Readonly<{ size: number; read: Reader }>,
  PlatformError.PlatformError,
  FileSystem.FileSystem | Scope.Scope
> =>
  Effect.gen(function* open() {
    const fs = yield* FileSystem.FileSystem;
    const file = yield* fs.open(path, { flag: "r" });
    const info = yield* file.stat;
    const read: Reader = (position, size) =>
      file
        .seek(BigInt(position), "start")
        .pipe(
          Effect.andThen(file.readAlloc(size)),
          Effect.map(Option.getOrElse(() => new Uint8Array())),
        );
    return { size: Number(info.size), read };
  });

const concat = (parts: readonly Uint8Array[]): Uint8Array =>
  Uint8Array.from(
    pipe(
      parts,
      Arr.flatMap((part) => [...part]),
    ),
  );

type LongLine = Readonly<{
  read: Reader;
  start: number;
  size: number;
  parts: readonly Uint8Array[];
  position: number;
}>;

const longLine = (
  line: LongLine,
): Effect.Effect<Option.Option<Chunk>, PlatformError.PlatformError> => {
  const { read, start, size, parts, position } = line;
  if (position >= size) {
    return Effect.succeedNone;
  }
  return read(position, MAX_CHUNK_BYTES).pipe(
    Effect.flatMap((block) => {
      if (block.byteLength === START) {
        return Effect.succeedNone;
      }
      const newline = block.indexOf(NEWLINE);
      if (newline === NOT_FOUND) {
        return longLine({
          ...line,
          parts: [...parts, block],
          position: position + block.byteLength,
        });
      }
      const text = decoder.decode(concat([...parts, block.subarray(START, newline + ONE)]));
      return Effect.succeedSome({ start, end: position + newline + ONE, text });
    }),
  );
};

const chunkOf = (view: Uint8Array, request: Read): Option.Option<Chunk> => {
  const lastNewline = view.lastIndexOf(NEWLINE);
  if (lastNewline === NOT_FOUND) {
    return Option.none();
  }
  return Option.some({
    start: request.start,
    end: request.start + lastNewline + ONE,
    text: decoder.decode(view.subarray(START, lastNewline + ONE)),
  });
};

const readChunk = (
  request: Read,
): Effect.Effect<Option.Option<Chunk>, PlatformError.PlatformError, FileSystem.FileSystem> =>
  Effect.gen(function* chunk() {
    const { size, read } = yield* readerOf(request.path);
    if (size <= request.start) {
      return Option.none();
    }
    const view = yield* read(request.start, Math.min(size - request.start, request.maxBytes));
    const found = chunkOf(view, request);
    if (Option.isSome(found) || view.byteLength < request.maxBytes) {
      return found;
    }
    return yield* longLine({
      read,
      start: request.start,
      size,
      parts: [],
      position: request.start,
    });
  }).pipe(Effect.scoped);

const subagentFiles = (
  directory: string,
): Effect.Effect<
  readonly TranscriptFile[],
  PlatformError.PlatformError,
  FileSystem.FileSystem | Path.Path
> =>
  Effect.gen(function* list() {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const names = yield* fs.readDirectory(directory);
    return pipe(
      names,
      Arr.filter(Str.endsWith(SUBAGENT_SUFFIX)),
      Arr.sortBy(Str.Order),
      Arr.map((name) => ({
        file: `subagents/${Str.slice(START, -SUBAGENT_SUFFIX.length)(name)}`,
        path: path.join(directory, name),
      })),
    );
  });

const transcriptFiles = (
  transcript: TranscriptFile,
): Effect.Effect<
  readonly TranscriptFile[],
  PlatformError.PlatformError,
  FileSystem.FileSystem | Path.Path
> =>
  Effect.gen(function* files() {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const directory = path.join(path.dirname(transcript.path), transcript.file, "subagents");
    const exists = yield* fs.exists(directory);
    if (!exists) {
      return [transcript];
    }
    const subagents = yield* subagentFiles(directory);
    return [transcript, ...subagents];
  });

/** @internal */
export { MAX_CHUNK_BYTES, readChunk, transcriptFiles };
/** @internal */
export type { Chunk, Read, TranscriptFile };
