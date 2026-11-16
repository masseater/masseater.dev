import { Effect, Layer, Match, Option, Schema, String as Str, pipe } from "effect";
import { FetchHttpClient, HttpClient, HttpClientResponse } from "effect/http";
import type { HttpClientError } from "effect/http";

import type { Song, Source } from "#protocol";
import { pageOf } from "#source";

type Credit = Readonly<{ title: string; artist: string }>;

type Lookup = Effect.Effect<
  Credit,
  HttpClientError.HttpClientError | Schema.SchemaError,
  HttpClient.HttpClient
>;

const OEmbedSchema = Schema.Struct({ title: Schema.String, author_name: Schema.String });

const NICONICO_TITLE = /<title>(?<text>[^<]*)<\/title>/u;
const NICONICO_ARTIST = /<(?:user_nickname|ch_name)>(?<text>[^<]*)<\//u;

const unescaped = (text: string): string =>
  pipe(
    text,
    Str.replaceAll("&lt;", "<"),
    Str.replaceAll("&gt;", ">"),
    Str.replaceAll("&quot;", '"'),
    Str.replaceAll("&#39;", "'"),
    Str.replaceAll("&amp;", "&"),
  );

const captured =
  (pattern: RegExp) =>
  (text: string): string =>
    pipe(
      Option.fromNullishOr(pattern.exec(text)),
      Option.flatMap((match) => Option.fromUndefinedOr(match.groups)),
      Option.flatMap((groups) => Option.fromUndefinedOr(groups["text"])),
      Option.match({ onNone: () => "", onSome: unescaped }),
    );

const oembed =
  (endpoint: string) =>
  (source: Source): Lookup =>
    HttpClient.get(endpoint, { urlParams: { format: "json", url: pageOf(source) } }).pipe(
      Effect.flatMap(HttpClientResponse.filterStatusOk),
      Effect.flatMap(HttpClientResponse.schemaBodyJson(OEmbedSchema)),
      Effect.map(({ title, author_name: artist }) => ({ title, artist })),
    );

const niconico = (source: Source): Lookup =>
  HttpClient.get(`https://ext.nicovideo.jp/api/getthumbinfo/${source.id}`).pipe(
    Effect.flatMap(HttpClientResponse.filterStatusOk),
    Effect.flatMap((response) => response.text),
    Effect.map((text) => ({
      title: captured(NICONICO_TITLE)(text),
      artist: captured(NICONICO_ARTIST)(text),
    })),
  );

const lookup = (source: Source): Lookup =>
  Match.value(source.site).pipe(
    Match.when("youtube", () => oembed("https://www.youtube.com/oembed")(source)),
    Match.when("soundcloud", () => oembed("https://soundcloud.com/oembed")(source)),
    Match.when("niconico", () => niconico(source)),
    Match.exhaustive,
  );

const found = (source: Source): Effect.Effect<Song, never, HttpClient.HttpClient> =>
  lookup(source).pipe(
    Effect.map(({ title, artist }) => ({ source, title, artist })),
    Effect.tapError((cause) =>
      Effect.logWarning("shirushi.songLookupFailed", { cause: String(cause) }),
    ),
    Effect.orElseSucceed(() => ({ source, title: source.id, artist: "" })),
  );

export const songOf = (source: Source): Effect.Effect<Song> =>
  Layer.build(FetchHttpClient.layer).pipe(
    Effect.flatMap((context) => Effect.provideContext(found(source), context)),
    Effect.scoped,
  );
