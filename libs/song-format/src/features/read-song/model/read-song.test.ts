import { expect, it } from "@effect/vitest";
import { Array as Arr, Effect, Option, String as Str, pipe } from "effect";
import { Note } from "tonal";

import type { Song } from "#/entities/song/index.ts";
import { fractionOf } from "#/shared/lib/ticks.ts";

import { header, oddMeter, twoFiveOne, withLine } from "./read-song.test.support.ts";
import { readSong } from "./read-song.ts";

const messagesOf = (text: string): Effect.Effect<readonly string[]> =>
  readSong(text).pipe(
    Effect.map((source) => {
      if (source.status === "valid") {
        return [];
      }
      return pipe(
        source.issues,
        Arr.map((issue) => issue.message),
      );
    }),
  );

const validSong = (text: string): Effect.Effect<Song> =>
  readSong(text).pipe(
    Effect.map((source) => {
      if (source.status === "invalid") {
        throw new Error(
          pipe(
            source.issues,
            Arr.map((issue) => issue.message),
            Arr.join("\n"),
          ),
        );
      }
      return source.song;
    }),
  );

const groupingOf = (groups: readonly number[]): string =>
  pipe(groups, Arr.map(String), Arr.join("+"));

const onTrack =
  (track: string) =>
  <Timed extends { readonly track: string }>(items: readonly Timed[]): readonly Timed[] =>
    pipe(
      items,
      Arr.filter((item) => item.track === track),
    );

it.effect("places notes by bar order and the note values before them", () =>
  Effect.gen(function* placement() {
    const song = yield* validSong(twoFiveOne);
    expect(
      pipe(
        song.bars,
        Arr.map((bar) => fractionOf(bar.start)),
      ),
    ).toStrictEqual(["0", "1/1", "2/1", "3/1"]);
    expect(
      pipe(
        onTrack("bass")(song.notes),
        Arr.map(
          (note) => `${String(note.bar)} ${fractionOf(note.offset)} ${Note.fromMidi(note.midi)}`,
        ),
      ),
    ).toStrictEqual(["1 0 D2", "1 1/2 A1", "2 0 G1", "2 1/2 D2", "3 0 C2", "4 0 C2"]);
    const hats = pipe(
      song.hits,
      Arr.filter((hit) => hit.voice === "hat"),
      Arr.map((hit) => fractionOf(hit.offset)),
      Arr.join(" "),
    );
    expect(hats).toBe("0 1/8 1/4 3/8 1/2 5/8 3/4 7/8");
    const section = pipe(
      Arr.head(song.bars),
      Option.flatMap((bar) => bar.section),
    );
    expect(Option.getOrNull(section)).toBe("verse");
  }),
);

it.effect("joins a tied chord with the same notes at the start of the next bar", () =>
  Effect.gen(function* tie() {
    const song = yield* validSong(twoFiveOne);
    const keys = pipe(
      onTrack("keys")(song.notes),
      Arr.map((note) => `${String(note.bar)} ${fractionOf(note.length)}`),
      Arr.dedupe,
    );
    expect(keys).toStrictEqual(["1 1/1", "2 1/1", "3 3/2"]);
  }),
);

it.effect("keeps meter changes, groupings and tuplets exact", () =>
  Effect.gen(function* meter() {
    const song = yield* validSong(oddMeter);
    expect(
      pipe(
        song.bars,
        Arr.map(
          (bar) =>
            `${fractionOf(bar.start)} ${fractionOf(bar.length)} ${groupingOf(bar.meter.groups)}`,
        ),
      ),
    ).toStrictEqual(["0 7/8 2+2+3", "7/8 5/4 3+2"]);
    expect(
      pipe(
        song.notes,
        Arr.map((note) => fractionOf(note.length)),
      ),
    ).toStrictEqual(["1/12", "1/12", "1/12", "1/4", "3/8"]);
    expect(
      pipe(
        song.slices,
        Arr.map((slice) => `${String(slice.index)} ${fractionOf(slice.start)}`),
      ),
    ).toStrictEqual(["0 7/8", "3 9/8"]);
    expect(
      pipe(
        song.edits,
        Arr.map((edit) => `${edit.edit} ${fractionOf(edit.start)} ${fractionOf(edit.length)}`),
      ),
    ).toStrictEqual(["stutter 11/8 1/4"]);
  }),
);

it.effect("reports a line whose note values do not fill the bar", () =>
  Effect.gen(function* fill() {
    const messages = yield* messagesOf(withLine("  bass: C2 1/4, D2 1/4"));
    expect(messages).toStrictEqual(["bass の合計は 1/2 で、この小節の 1/1 に 1/2 足りません"]);
  }),
);

it.effect("reports sounds that do not belong to the track", () =>
  Effect.gen(function* kinds() {
    const missingVoice = yield* messagesOf(withLine("  drums: clap 1/1"));
    expect(missingVoice).toStrictEqual([
      "clap は kit studio にありません。あるのは kick, snare, hat です",
    ]);
    const pitchOnKit = yield* messagesOf(withLine("  drums: C4 1/1"));
    expect(pitchOnKit).toStrictEqual(["音高はこのトラックに書けません"]);
    const hitOnInstrument = yield* messagesOf(withLine("  bass: kick 1/1"));
    expect(hitOnInstrument).toStrictEqual(["kick はこのトラックに書けません"]);
  }),
);

it.effect("rejects a value written in the wrong unit", () =>
  Effect.gen(function* units() {
    const text = Str.replace("mix 30%", "mix 30Hz")(header);
    const messages = yield* messagesOf(text);
    expect(Arr.isReadonlyArrayNonEmpty(messages)).toBe(true);
  }),
);

it.effect("reports names that refer to nothing", () =>
  Effect.gen(function* references() {
    const text = Str.replace("send room 20%", "send hall 20%")(header);
    const messages = yield* messagesOf(text);
    const mentions = pipe(messages, Arr.some(Str.includes("hall")));
    expect(mentions).toBe(true);
  }),
);

it.effect("reports a tie with nothing to continue into", () =>
  Effect.gen(function* tie() {
    const messages = yield* messagesOf(withLine("  bass: C2 1/1 tie"));
    expect(messages).toStrictEqual(["tie の続きの音が次の小節の頭にありません"]);
  }),
);

it.effect("reports a grouping that does not add up to the meter", () =>
  Effect.gen(function* grouping() {
    const text = `${header}\nbar meter 7/8 (2+2+2) tempo 120bpm {\n  bass: C2 7/8\n}\n`;
    const messages = yield* messagesOf(text);
    expect(messages).toStrictEqual(["拍の区切りの合計は 6 で、7/8 の 7 と合いません"]);
  }),
);

it.effect("needs meter and tempo on the first bar", () =>
  Effect.gen(function* first() {
    const messages = yield* messagesOf(`${header}\nbar {\n  bass: C2 1/1\n}\n`);
    expect(messages).toStrictEqual([
      "最初の小節には meter を書きます",
      "最初の小節には tempo を書きます",
    ]);
  }),
);

it.effect("reads the mixer settings of a track", () =>
  Effect.gen(function* mixer() {
    const song = yield* validSong(twoFiveOne);
    const settings = pipe(
      song.tracks,
      Arr.map(
        ({ name, mixer }) =>
          `${name} ${mixer.volumeDecibels}dB ${mixer.pan} ${String(mixer.muted)}`,
      ),
    );
    expect(settings).toStrictEqual([
      "drums 0dB 0 false",
      "keys 0dB 0 false",
      "bass -4.5dB -0.2 true",
      "loop 0dB 0 false",
    ]);
  }),
);

it.effect("reports automation of a parameter the target does not have", () =>
  Effect.gen(function* automation() {
    const volume = yield* messagesOf(
      withLine("  bass: C2 1/1\n  automate keys.volume -12dB -> 0dB over 2bar"),
    );
    expect(volume).toStrictEqual([]);
    const typo = yield* messagesOf(
      withLine("  bass: C2 1/1\n  automate keys.gian -12dB -> 0dB over 2bar"),
    );
    expect(typo).toStrictEqual([
      "keys の gian は自動化できません。できるのは volume, pan, chorus です",
    ]);
    const unit = yield* messagesOf(
      withLine("  bass: C2 1/1\n  automate keys.pan -12dB -> 50% over 2bar"),
    );
    expect(unit).toStrictEqual(["pan は % で書きます"]);
  }),
);
