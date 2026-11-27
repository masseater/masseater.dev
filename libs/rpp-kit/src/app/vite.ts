import { contentImport, declarationPathOf } from "@r_masseater/mapped-import/vite";
import { Effect, Match, Option, Schema } from "effect";
import type { Plugin } from "vite-plus";

import { readSong } from "#/entities/song/index.ts";
import { mapRpp } from "#/features/map-rpp/index.ts";

const EXTENSION = ".rpp";

export const declarationPath = declarationPathOf(EXTENSION);

const encodeSong = Schema.encodeEffect(Schema.fromJsonString(Schema.Unknown));

const declarationOf = (content: string): Option.Option<string> =>
  Match.value(mapRpp(content)).pipe(
    Match.discriminatorsExhaustive("status")({
      ok: ({ code }) => Option.some(code),
      error: () => Option.none(),
    }),
  );

export const rpp = (): Plugin =>
  contentImport({
    name: "rpp-kit",
    extension: EXTENSION,
    load: ({ content }) =>
      encodeSong(readSong(content)).pipe(
        Effect.orDie,
        Effect.map((json) => ({
          code: `export const song = ${json};\n`,
          declaration: declarationOf(content),
          watchFiles: [],
        })),
      ),
  });
