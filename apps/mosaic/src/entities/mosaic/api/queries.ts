import {
  Candidates,
  PublishedMosaic,
  Tiles,
  manifestPath,
  slugPath,
  versionPath,
} from "@thumb-mosaic/mosaic";
import { Array, Effect, Option, pipe } from "effect";
import type { Schema } from "effect";
import { HttpClient, HttpClientResponse } from "effect/http";
import type { HttpClientError } from "effect/http";

import { BASE_PATH } from "#/shared/config/index.ts";
import { runtime } from "#/shared/lib/telemetry.ts";

export type Mosaic = typeof PublishedMosaic.Type;
export type TileList = typeof Tiles.Type;
export type CandidateList = typeof Candidates.Type;
type FetchError = HttpClientError.HttpClientError | Schema.SchemaError;

export interface Query<Value> {
  readonly queryKey: readonly string[];
  readonly queryFn: (context: Readonly<{ signal: AbortSignal }>) => Promise<Value>;
  readonly staleTime: number;
}

export interface VariantFile {
  readonly slug: string;
  readonly mosaic: Mosaic;
  readonly variant: number;
}

const MISSING = "";

interface Resource<Value> {
  readonly key: string;
  readonly fetch: (path: string) => Effect.Effect<Value, FetchError, HttpClient.HttpClient>;
}

const resourceOf = <Codec extends Schema.Constraint & { readonly DecodingServices: never }>({
  key,
  span,
  schema,
}: Readonly<{ key: string; span: string; schema: Codec }>): Resource<Codec["Type"]> => {
  const decode = HttpClientResponse.schemaBodyJson(schema);
  return {
    key,
    fetch: (path) =>
      HttpClient.get(`${BASE_PATH}/${path}`).pipe(
        Effect.flatMap(HttpClientResponse.filterStatusOk),
        Effect.flatMap(decode),
        Effect.withSpan(span, { attributes: { path } }),
      ),
  };
};

const queryOf =
  <Value>(resource: Resource<Value>) =>
  (path: string): Query<Value> => ({
    queryKey: [resource.key, path],
    queryFn: ({ signal }) => runtime.runPromise(resource.fetch(path), { signal }),
    staleTime: Number.POSITIVE_INFINITY,
  });

const mosaicAt = queryOf(
  resourceOf({ key: "mosaic", span: "mosaic.manifest", schema: PublishedMosaic }),
);
const candidatesAt = queryOf(
  resourceOf({ key: "candidates", span: "mosaic.candidates", schema: Candidates }),
);
const tilesAt = queryOf(resourceOf({ key: "tiles", span: "mosaic.tiles", schema: Tiles }));

export const mosaicQuery = (slug: string): Query<Mosaic> => mosaicAt(manifestPath(slug));

export const candidatesQuery = ({
  slug,
  mosaic,
}: Omit<VariantFile, "variant">): Query<CandidateList> =>
  candidatesAt(`${slugPath(slug)}/${mosaic.candidates}`);

const variantPath = ({ slug, mosaic, variant }: VariantFile): string =>
  pipe(
    Array.get(mosaic.variants, variant),
    Option.match({
      onNone: () => MISSING,
      onSome: ({ version }) => versionPath({ slug, variant, version }),
    }),
  );

export const tilesQuery = (file: VariantFile): Query<TileList> =>
  tilesAt(`${variantPath(file)}/${file.mosaic.tiles}`);

export const tileChunkQuery = (file: VariantFile & { readonly index: number }): Query<TileList> =>
  tilesAt(
    `${variantPath(file)}/${file.mosaic.chunk.dir}/${Math.floor(file.index / file.mosaic.chunk.size)}.json`,
  );
