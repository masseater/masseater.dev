import { Effect, Predicate, Record as Rec, Array as Arr, pipe } from "effect";
import { gzip, strToU8, zip } from "fflate";
import type { AsyncZippable } from "fflate";

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

const zipOf = (files: Readonly<Record<string, string | Uint8Array>>): Effect.Effect<Uint8Array> =>
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

const gzipOf = (bytes: Uint8Array): Effect.Effect<Uint8Array> =>
  Effect.callback<Uint8Array>((resume) => {
    gzip(bytes, (cause, zipped) => {
      if (cause !== null) {
        throw cause;
      }
      resume(Effect.succeed(zipped));
    });
  });

export { gzipOf, zipOf };
