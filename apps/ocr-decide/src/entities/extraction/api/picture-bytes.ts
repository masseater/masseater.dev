import { Effect, Match, Option, Predicate } from "effect";
import { HttpClient } from "effect/http";

import type { Source } from "#/entities/extraction/model/picture.ts";

import { asPng, failure } from "./as-png.ts";
import type { Loaded, PictureError } from "./as-png.ts";

const NO_TYPE = "";

const typeOf = (headers: Readonly<Record<string, string | undefined>>): string =>
  Option.fromNullishOr(headers["content-type"]).pipe(Option.getOrElse(() => NO_TYPE));

const fetched = (url: string): Effect.Effect<Loaded, PictureError, HttpClient.HttpClient> =>
  HttpClient.get(url).pipe(
    Effect.flatMap((response) =>
      response.arrayBuffer.pipe(
        Effect.map((buffer) => ({
          bytes: new Uint8Array(buffer),
          type: typeOf(response.headers),
        })),
      ),
    ),
    Effect.mapError(failure),
  );

const read = (file: File): Effect.Effect<Loaded, PictureError> =>
  Effect.tryPromise({ try: () => file.arrayBuffer(), catch: failure }).pipe(
    Effect.map((buffer) => ({ bytes: new Uint8Array(buffer), type: file.type })),
  );

/** @internal */
export const pictureBytes = (
  source: Source,
): Effect.Effect<Uint8Array, PictureError, HttpClient.HttpClient> =>
  Match.value(source).pipe(
    Match.when(Predicate.isString, fetched),
    Match.orElse(read),
    Effect.flatMap(asPng),
  );
