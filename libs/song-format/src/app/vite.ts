import { Array as Arr, Effect, Match, Option, pipe } from "effect";
import { renderSegments } from "mapped-import";
import type { Mapped } from "mapped-import/mapper";
import { contentImport } from "mapped-import/vite";
import type { Plugin } from "vite-plus";

import { songCodeOf, songModuleOf } from "#/features/read-song/index.ts";
import { FumxLanguageMetaData } from "#generated/langium/module.ts";

const [EXTENSION] = FumxLanguageMetaData.fileExtensions;

const failure = (mapped: Mapped): string =>
  Match.value(mapped).pipe(
    Match.discriminatorsExhaustive("status")({
      ok: () => "",
      error: ({ issues }) =>
        pipe(
          issues,
          Arr.map((issue) => issue.message),
          Arr.join("\n"),
        ),
    }),
  );

const declarationOf = (content: string, mapped: Mapped): Option.Option<string> =>
  Match.value(mapped).pipe(
    Match.discriminatorsExhaustive("status")({
      ok: ({ segments }) => Option.some(renderSegments({ content, segments })),
      error: () => Option.none(),
    }),
  );

export const fumx = (): Plugin =>
  contentImport({
    name: "song-format",
    extension: EXTENSION,
    load: ({ id, content, read }) =>
      Effect.gen(function* load() {
        const module = yield* songModuleOf({ path: id, content, read });
        const song = yield* Option.match(module.song, {
          onNone: () => Effect.die(new Error(failure(module.mapped))),
          onSome: Effect.succeed,
        });
        return {
          code: yield* songCodeOf(song),
          declaration: declarationOf(content, module.mapped),
          watchFiles: pipe(
            module.files,
            Arr.filter((file) => file !== id),
          ),
        };
      }),
  });
