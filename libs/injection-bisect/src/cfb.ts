import { find, read } from "cfb";
import type { CFB$Container } from "cfb";
import { Effect, Option, Result, Array as Arr, pipe } from "effect";

import { ReadError, readErrorOf } from "./read-error.ts";

const BIT = 2;

const SET = 1;

const utf16le = new TextDecoder("utf-16le");

const viewOf = (bytes: Uint8Array): DataView =>
  new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

const hasFlag =
  (flag: number) =>
  (value: number): boolean =>
    Math.floor(value / flag) % BIT === SET;

const containerOf = (bytes: Uint8Array): Result.Result<CFB$Container, ReadError> =>
  Result.try({
    try: () => read(bytes, { type: "array" }),
    catch: readErrorOf,
  });

const hasStream =
  (matches: (name: string) => boolean) =>
  (bytes: Uint8Array): boolean =>
    Result.match(containerOf(bytes), {
      onFailure: () => false,
      onSuccess: ({ FileIndex }) =>
        pipe(
          FileIndex,
          Arr.some(({ name }) => matches(name)),
        ),
    });

const streamOf =
  (bytes: Uint8Array) =>
  (name: string): Effect.Effect<Uint8Array, ReadError> =>
    Effect.fromResult(containerOf(bytes)).pipe(
      Effect.flatMap((container) =>
        Effect.fromOption(Option.fromNullishOr(find(container, name))).pipe(
          Effect.mapError(() => ReadError.make({ reason: `missing stream: ${name}` })),
        ),
      ),
      Effect.map(({ content }) => Uint8Array.from(content)),
    );

export { hasFlag, hasStream, streamOf, utf16le, viewOf };
