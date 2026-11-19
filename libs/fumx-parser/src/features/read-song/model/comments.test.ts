import { expect, it } from "@effect/vitest";
import { Array as Arr, Effect, pipe } from "effect";

import { ENTRY, filesOf } from "./read-song.test.support.ts";
import { readSong } from "./read-song.ts";

const commented = `// zero
song "a // not a comment"
// first
instrument keys sample "keys.flac" root C4 /* second */
track keys instrument keys
/* third
   spans */
bar meter 4/4 tempo 120bpm {
  keys: C4 1/1 // fourth
}
// last
`;

const commentsIn = (text: string): Effect.Effect<readonly string[]> =>
  Effect.map(readSong(filesOf({ [ENTRY]: text })), (source) =>
    pipe(
      source.outline.comments,
      Arr.map((comment) => `${String(comment.line)}:${String(comment.column)} ${comment.text}`),
    ),
  );

it.effect("lists the line and block comments of the song with their positions", () =>
  Effect.gen(function* comments() {
    const found = yield* commentsIn(commented);
    expect(found).toStrictEqual([
      "1:1 // zero",
      "3:1 // first",
      "4:44 /* second */",
      "6:1 /* third\n   spans */",
      "9:16 // fourth",
      "11:1 // last",
    ]);
  }),
);

it.effect("does not take comment markers inside a string for a comment", () =>
  Effect.gen(function* strings() {
    const found = yield* commentsIn(`song "a // b /* c */"
instrument keys sample "keys.flac" root C4
track keys instrument keys
bar meter 4/4 tempo 120bpm {
  keys: C4 1/1
}
`);
    expect(found).toStrictEqual([]);
  }),
);
