import { expect, it } from "@effect/vitest";
import { Array as Arr, Effect, Option, String as Str, pipe } from "effect";

import {
  ENTRY,
  filesOf,
  importing,
  library,
  messagesIn,
  songIn,
} from "./read-song.test.support.ts";

const LIBRARY = "/lib/kit.fu";

it.effect("brings in what a song imports and what that needs", () =>
  Effect.gen(function* imported() {
    const files = filesOf({ [ENTRY]: importing("studio, keys"), [LIBRARY]: library });
    const song = yield* songIn(files);
    expect(
      pipe(
        song.tracks,
        Arr.map((track) => track.name),
      ),
    ).toStrictEqual(["keys", "drums"]);
    expect(
      pipe(
        song.buses,
        Arr.map((bus) => bus.name),
      ),
    ).toStrictEqual(["room"]);
    expect(
      pipe(
        song.kits,
        Arr.flatMap((kit) => kit.voices),
        Arr.map((voice) => voice.path),
      ),
    ).toStrictEqual(["../lib/kick.flac"]);
    expect(
      pipe(
        song.instruments,
        Arr.flatMap((instrument) => {
          if (instrument.source.kind === "samples") {
            return instrument.source.zones;
          }
          return [];
        }),
        Arr.map((zone) => zone.path),
      ),
    ).toStrictEqual(["../lib/keys.flac"]);
    expect(
      pipe(
        song.buses,
        Arr.flatMap((bus) => bus.fx),
        Arr.flatMap((effect) => {
          if (effect.kind === "reverb") {
            return [effect.left];
          }
          return [];
        }),
      ),
    ).toStrictEqual(["../lib/room.flac"]);
    expect(Option.isSome(Arr.head(song.notes))).toBe(true);
  }),
);

it.effect("reports a name the imported file does not have", () =>
  Effect.gen(function* unknown() {
    const files = filesOf({ [ENTRY]: importing("studio, keys, organ"), [LIBRARY]: library });
    const messages = yield* messagesIn(files);
    const mentions = pipe(messages, Arr.some(Str.includes("organ")));
    expect(mentions).toBe(true);
  }),
);

it.effect("reports a file that is not there", () =>
  Effect.gen(function* missing() {
    const messages = yield* messagesIn(filesOf({ [ENTRY]: importing("studio, keys") }));
    expect(messages).toContain("../lib/kit.fu というファイルがありません");
  }),
);

it.effect("keeps names that are not imported out of reach", () =>
  Effect.gen(function* hidden() {
    const files = filesOf({ [ENTRY]: importing("keys"), [LIBRARY]: library });
    const messages = yield* messagesIn(files);
    const mentions = pipe(messages, Arr.some(Str.includes("studio")));
    expect(mentions).toBe(true);
  }),
);

it.effect("reports a declaration that clashes with an imported name", () =>
  Effect.gen(function* clash() {
    const text = Str.replace(
      "track drums kit studio",
      'track drums kit studio\nkit studio {\n  kick "k.flac"\n}',
    )(importing("studio, keys"));
    const messages = yield* messagesIn(filesOf({ [ENTRY]: text, [LIBRARY]: library }));
    expect(messages).toContain("studio は import した名前と重なっています");
  }),
);
