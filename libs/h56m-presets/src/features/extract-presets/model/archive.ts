import { Array as Arr, Effect, Option, Record as Rec, Schema, String as Str, pipe } from "effect";

import { ExtractFailed } from "./errors.ts";

const BETTERLEAKS = "/betterleaks/betterleaks/";

const Sources = Schema.fromJsonString(
  Schema.Record(Schema.String, Schema.OptionFromNullOr(Schema.String)),
);

export interface Source {
  readonly url: string;
  readonly text: string;
}

export const gunzipped = (archive: Uint8Array): Effect.Effect<string, ExtractFailed> =>
  Effect.tryPromise({
    try: () =>
      new Response(
        new Blob([new Uint8Array(archive)]).stream().pipeThrough(new DecompressionStream("gzip")),
      ).text(),
    catch: (cause) => ExtractFailed.make({ message: `could not gunzip: ${String(cause)}` }),
  });

export const sourcesOf = (
  json: string,
): Effect.Effect<Readonly<Record<string, Option.Option<string>>>, ExtractFailed> =>
  Schema.decodeEffect(Sources)(json).pipe(
    Effect.mapError((cause) =>
      ExtractFailed.make({ message: `unknown archive: ${cause.message}` }),
    ),
  );

export const betterleaksFile =
  (suffix: string) =>
  (
    sources: Readonly<Record<string, Option.Option<string>>>,
  ): Effect.Effect<Source, ExtractFailed> =>
    pipe(
      Rec.toEntries(sources),
      Arr.findFirst(([url]) => Str.includes(BETTERLEAKS)(url) && Str.endsWith(suffix)(url)),
      Option.flatMap(([url, text]): Option.Option<Source> =>
        pipe(
          text,
          Option.map((found): Source => ({ url, text: found })),
        ),
      ),
      Effect.fromOption,
      Effect.mapError(() =>
        ExtractFailed.make({ message: `no Betterleaks ${suffix} in the archive` }),
      ),
    );
