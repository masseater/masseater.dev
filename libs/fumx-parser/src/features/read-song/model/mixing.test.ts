import { expect, it } from "@effect/vitest";
import { Array as Arr, Effect, Option, pipe } from "effect";

import { validSong } from "./read-song.test.support.ts";

const NUDGE_SECONDS = 1.7e-9;
const VELOCITY = 0.855;
const LENGTH_MILLISECONDS = 160.125;
const LENGTH_SECONDS = 0.160125;
const TAIL_SECONDS = 1.6;

const mixed = `song "mixed"

plugin voice from "voice.ts" {}
plugin desk from "desk.ts" { order: string }

kit studio {
  kick "kick.flac"
  sung plugin voice
}

track drums kit studio mono
track drums-late kit studio into drums

master tail 1600ms mix desk order "drums drums-late"
bar meter 4/4 tempo 160bpm {
  drums: kick 1/4 vel 0.855 nudge 0.0000017ms length 160.125ms pan -35% rate 1.25 bend 0ms:0st 45ms:-2st, sung 3/4 with { key 70 mode "akai" duck true }
  drums-late: kick 1/1 offset 0.4ms
}
`;

it.effect("keeps times and shares written in decimals exact, as the double the decimal names", () =>
  Effect.gen(function* exact() {
    const song = yield* validSong(mixed);
    const kick = pipe(Arr.head(song.hits), Option.getOrThrow);
    expect(kick.nudgeSeconds).toBe(NUDGE_SECONDS);
    expect(kick.velocity).toBe(VELOCITY);
    expect(
      pipe(
        kick.params,
        Arr.map((param) => param.kind),
      ),
    ).toStrictEqual(["length", "pan", "rate"]);
    expect(kick.params).toContainEqual({
      kind: "length",
      milliseconds: LENGTH_MILLISECONDS,
      seconds: LENGTH_SECONDS,
    });
    expect(kick.params).toContainEqual({ kind: "pan", amount: -0.35 });
    expect(kick.params).toContainEqual({ kind: "rate", ratio: 1.25 });
    expect(kick.bend).toStrictEqual([
      { milliseconds: 0, seconds: 0, semitones: 0 },
      { milliseconds: 45, seconds: 0.045, semitones: -2 },
    ]);
  }),
);

it.effect("reads plugin voices and per-hit plugin values", () =>
  Effect.gen(function* plugins() {
    const song = yield* validSong(mixed);
    const sung = pipe(
      song.hits,
      Arr.findFirst((hit) => hit.voice === "sung"),
      Option.getOrThrow,
    );
    expect(sung.args).toStrictEqual([
      { name: "key", value: { kind: "number", value: 70 } },
      { name: "mode", value: { kind: "text", value: "akai" } },
      { name: "duck", value: { kind: "flag", value: true } },
    ]);
    const voices = pipe(
      song.kits,
      Arr.flatMap((kit) => kit.voices),
      Arr.map(
        (voice) =>
          [
            voice.name,
            voice.path,
            pipe(
              voice.plugin,
              Option.map((use) => use.module),
            ),
          ] as const,
      ),
    );
    expect(voices).toStrictEqual([
      ["kick", "kick.flac", Option.none()],
      ["sung", "", Option.some("voice.ts")],
    ]);
  }),
);

it.effect("reads layered tracks, the tail and the master mix", () =>
  Effect.gen(function* mixing() {
    const song = yield* validSong(mixed);
    expect(
      pipe(
        song.tracks,
        Arr.map((track) => [track.name, track.mono, track.into] as const),
      ),
    ).toStrictEqual([
      ["drums", true, Option.none()],
      ["drums-late", false, Option.some("drums")],
    ]);
    expect(song.tailSeconds).toStrictEqual(Option.some(TAIL_SECONDS));
    expect(
      pipe(
        song.mix,
        Option.map((use) => [use.plugin, use.module, use.arguments] as const),
      ),
    ).toStrictEqual(
      Option.some([
        "desk",
        "desk.ts",
        [{ name: "order", value: { kind: "text", value: "drums drums-late" } }],
      ]),
    );
  }),
);
