import { Array as Arr, Effect, Option, Predicate, Record as Rec, pipe } from "effect";

import type { InvalidRecord } from "#/features/mcp/model/invalid-record";
import { MEDIA_ID_KEYS, MEDIA_TYPES, SHARED_MEDIA_ID_KEYS } from "#/features/mcp/model/life-body";
import type { MediaType } from "#/features/mcp/model/life-body";

import type { Body } from "./life-record";

const isMediaType = (value: unknown): value is MediaType =>
  pipe(
    MEDIA_TYPES,
    Arr.some((mediaType) => mediaType === value),
  );

const allowedFor = (mediaType: MediaType): readonly string[] => [
  ...MEDIA_ID_KEYS[mediaType],
  ...SHARED_MEDIA_ID_KEYS,
];

const idKeysOf = (body: Body): readonly string[] =>
  pipe(
    Rec.get(body, "ids"),
    Option.filter(Predicate.isObject),
    Option.map((ids) => Rec.keys(ids)),
    Option.getOrElse((): readonly string[] => []),
  );

const misplacedMessage = (mediaType: MediaType, misplaced: readonly string[]): string =>
  `ids ${Arr.join(misplaced, ", ")} are not used for ${mediaType}. Use ${Arr.join(allowedFor(mediaType), ", ")}.`;

const checkType =
  (fail: (message: string) => InvalidRecord, body: Body) =>
  (mediaType: MediaType): Effect.Effect<Body, InvalidRecord> => {
    const misplaced = Arr.difference(idKeysOf(body), allowedFor(mediaType));
    return Arr.match(misplaced, {
      onEmpty: () => Effect.succeed(body),
      onNonEmpty: (keys) => Effect.fail(fail(misplacedMessage(mediaType, keys))),
    });
  };

const checkMediaIds =
  (fail: (message: string) => InvalidRecord) =>
  (body: Body): Effect.Effect<Body, InvalidRecord> =>
    Option.match(pipe(Rec.get(body, "mediaType"), Option.filter(isMediaType)), {
      onNone: () => Effect.succeed(body),
      onSome: checkType(fail, body),
    });

export { checkMediaIds };
