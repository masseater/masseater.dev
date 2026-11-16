import type { LiveMix, RenderSession, Rendered, Song, Tape } from "@masseater.dev/daw-view";
import { Effect, Option, pipe } from "effect";

import { dawSongOf, samplesIn } from "#/entities/song/model/daw.ts";
import { FIELD } from "#/entities/song/model/program.ts";
import type { Ledger, View } from "#/entities/song/model/program.ts";
import { sheetOf } from "#/entities/song/model/take.ts";
import { tapeFor } from "#/entities/song/model/tape.ts";

import type { Mastered, Rendering } from "./program/song.js";
import { engine, frames, masteredOn, player, program } from "./session.ts";
import { work } from "./work.ts";

const sheetFor = sheetOf("WALL LP");

const MIXED: readonly string[] = [
  "KICK",
  "DRUMS",
  "BASS SUB",
  "BASS MID",
  "ORGAN",
  "FM PIANO",
  "PAD",
  "VOICES",
  "FRONT VOICE",
  "FX",
  "PLATE SEND",
  "DELAY SEND",
];

const liveOf =
  (out: Mastered) =>
  (tape: Tape): LiveMix => ({
    tracks: MIXED,
    player,
    init: {
      [FIELD.frames]: out.L.length,
      SR: engine.SR,
      tracks: MIXED.length,
      comp: out.comp,
      lim: out.lim,
      clip: out.clip,
      dec: out.dec,
    },
    transfer: [out.comp.buffer, out.lim.buffer],
    tape,
  });

const sinkOn = (tape: Tape): NonNullable<Rendering["tape"]> => ({
  write: (name, left, right) => {
    tape.write(MIXED.indexOf(name), left, right);
  },
});

const renderingOn: (log: Ledger, view: View) => (tape: Option.Option<Tape>) => Rendering =
  (log, view) => (tape) =>
    Option.match(tape, {
      onNone: () => ({ log, view }),
      onSome: (taped) => ({ log, view, tape: sinkOn(taped) }),
    });

const withLive =
  (mixdown: Rendered) =>
  (live: Option.Option<LiveMix>): Rendered =>
    Option.match(live, {
      onNone: () => mixdown,
      onSome: (given) => ({
        left: mixdown.left,
        right: mixdown.right,
        take: mixdown.take,
        live: given,
      }),
    });

const rendered = Effect.fn("song.life-is-but-a.render")(function* rendered({
  samples,
  report,
}: Omit<RenderSession, "signal">) {
  const { log, view, progress, take } = sheetFor(report);
  const tape = yield* tapeFor({ tracks: MIXED.length, frames });
  const render = masteredOn(renderingOn(log, view)(tape));
  const out = yield* Effect.promise(() => render(samples, progress));
  const live = pipe(tape, Option.map(liveOf(out)));
  return withLive({ left: out.L, right: out.R, take: take() })(live);
});

export const song: Song = dawSongOf({
  work,
  form: program,
  look: {
    hues: {
      KICK: 52,
      DRUMS: 88,
      "BASS SUB": 262,
      "BASS MID": 296,
      ORGAN: 152,
      "FM PIANO": 188,
      PAD: 226,
      VOICES: 352,
      "FRONT VOICE": 30,
      FX: 326,
      "PLATE SEND": 250,
      "DELAY SEND": 205,
      EDIT: 0,
    },
    tones: { "PLATE SEND": "faint", "DELAY SEND": "faint", EDIT: "ink" },
  },
  sampleUrls: samplesIn(
    import.meta.glob<string>("./samples/*.flac", { query: "?url", import: "default", eager: true }),
  ),
  sampleRate: engine.SR,
  render: ({ signal, ...session }) =>
    Effect.runPromise(Effect.scoped(rendered(session)), { signal }),
});
