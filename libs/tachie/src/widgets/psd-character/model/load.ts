import { getAudioData } from "@remotion/media-utils";
import type { MediaUtilsAudioData } from "@remotion/media-utils";
import { readPsd } from "ag-psd";
import { Array as Arr, Effect, Option, Schema, pipe } from "effect";
import { HttpClient, HttpClientResponse } from "effect/http";

import { buildLayerTree, parseFavorites } from "#/entities/character/index.ts";
import type { Favorites, LayerTree } from "#/entities/character/index.ts";

export interface Character {
  readonly tree: LayerTree;
  readonly favorites: Option.Option<Favorites>;
}

export interface Source {
  readonly psd: string;
  readonly favorites?: string | undefined;
}

const taggedError = Schema.TaggedError;

export class LoadError extends taggedError<LoadError, { readonly brand: unique symbol }>()(
  "LoadError",
  { url: Schema.String, reason: Schema.String },
) {}

const failedAt =
  (url: string) =>
  (cause: unknown): LoadError =>
    LoadError.make({ url, reason: String(cause) });

const fetched = (
  url: string,
): Effect.Effect<HttpClientResponse.HttpClientResponse, LoadError, HttpClient.HttpClient> =>
  Effect.gen(function* fetchOk() {
    const client = yield* HttpClient.HttpClient;
    return yield* pipe(
      client.get(url),
      Effect.flatMap(HttpClientResponse.filterStatusOk),
      Effect.mapError((cause) => failedAt(url)(cause)),
    );
  });

const treeOf = (url: string): Effect.Effect<LayerTree, LoadError, HttpClient.HttpClient> =>
  Effect.gen(function* readTree() {
    const response = yield* fetched(url);
    const bytes = yield* Effect.mapError(response.arrayBuffer, (cause) => failedAt(url)(cause));
    return yield* Effect.try({
      try: () =>
        buildLayerTree(readPsd(bytes, { skipThumbnail: true, skipCompositeImageData: true })),
      catch: (cause) => failedAt(url)(cause),
    });
  });

const favoritesOf = (
  url: string,
  tree: LayerTree,
): Effect.Effect<Option.Option<Favorites>, LoadError, HttpClient.HttpClient> =>
  Effect.gen(function* readFavorites() {
    const response = yield* fetched(url);
    const text = yield* Effect.mapError(response.text, (cause) => failedAt(url)(cause));
    return parseFavorites({ text, tree });
  });

/** @internal */
export const loadCharacter = (
  source: Source,
): Effect.Effect<Character, LoadError, HttpClient.HttpClient> =>
  Effect.gen(function* load() {
    const tree = yield* treeOf(source.psd);
    const favorites = yield* pipe(
      Option.fromNullishOr(source.favorites),
      Option.match({
        onNone: () => Effect.succeed(Option.none<Favorites>()),
        onSome: (url) => favoritesOf(url, tree),
      }),
    );
    return { tree, favorites };
  });

/** @internal */
export const loadRecordings = (
  sources: readonly string[],
): Effect.Effect<ReadonlyMap<string, MediaUtilsAudioData>, LoadError> =>
  pipe(
    sources,
    Arr.map((src) =>
      Effect.tryPromise({
        try: () => getAudioData(src),
        catch: (cause) => failedAt(src)(cause),
      }).pipe(Effect.map((data) => [src, data] as const)),
    ),
    Effect.all,
    Effect.map((entries): ReadonlyMap<string, MediaUtilsAudioData> => new Map(entries)),
  );
