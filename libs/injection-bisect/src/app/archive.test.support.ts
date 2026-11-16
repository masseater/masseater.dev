import { Effect, Predicate, Stream, Record as Rec, Array as Arr, pipe } from "effect";
import { Tar } from "effect/encoding";
import { strToU8, zip } from "fflate";
import type { AsyncZippable } from "fflate";

export type Files = Readonly<Record<string, string | Uint8Array>>;

const STORED = 0;

const MIMETYPE = "mimetype";

const bytesOf = (content: string | Uint8Array): Uint8Array => {
  if (Predicate.isString(content)) {
    return strToU8(content);
  }
  return content;
};

const entryOf = ([name, content]: readonly [string, string | Uint8Array]): readonly [
  string,
  AsyncZippable[string],
] => {
  if (name === MIMETYPE) {
    return [name, [bytesOf(content), { level: STORED }]];
  }
  return [name, bytesOf(content)];
};

export const zipOf = (files: Files): Effect.Effect<Uint8Array> =>
  Effect.callback<Uint8Array>((resume) => {
    const entries = pipe(
      Rec.toEntries(files),
      Arr.map((entry) => entryOf(entry)),
      Rec.fromEntries,
    );
    zip(entries, (cause, zipped) => {
      if (cause !== null) {
        throw cause;
      }
      resume(Effect.succeed(zipped));
    });
  });

export const tarOf = (files: Files): Effect.Effect<Uint8Array> =>
  Stream.fromIterable(
    pipe(
      Rec.toEntries(files),
      Arr.map(([name, content]) => Tar.file(name, content)),
    ),
  ).pipe(Stream.pipeThroughChannel(Tar.encode()), Stream.mkUint8Array, Effect.orDie);

export const gzipOf = (bytes: Uint8Array): Effect.Effect<Uint8Array> =>
  Effect.promise(() =>
    new Response(
      new Blob([Uint8Array.from(bytes)]).stream().pipeThrough(new CompressionStream("gzip")),
    ).bytes(),
  );
