import type { RenderSession, Song } from "@masseater.dev/daw-view";
import { Effect } from "effect";

import { dawSongOf, samplesIn } from "#/entities/song/model/daw.ts";
import { sheetOf } from "#/entities/song/model/take.ts";
import { tapeFor } from "#/entities/song/model/tape.ts";

import { heldOn } from "./deck.ts";
import { masteredWith } from "./live.ts";
import { engine, openedOn, program } from "./session.ts";
import { renderTracks } from "./tracks.ts";
import { work } from "./work.ts";

const sheetFor = sheetOf("MASTER LP");
const START = 0;

const rendered = Effect.fn("song.kuraku-narikake.render")(function* rendered({
  samples,
  report,
}: Omit<RenderSession, "signal">) {
  const sheet = sheetFor(report);
  const session = openedOn(sheet)(samples);
  sheet.progress(START, "tracks");
  const tape = yield* tapeFor({ tracks: session.tracks.length, frames: session.N });
  const held = heldOn(session.N)(tape);
  const drums = yield* renderTracks({ engine, session, samples, sheet, held });
  const stems = held.stemsOf(session.tracks, drums);
  const out = yield* Effect.promise(() => session.master(stems, held.deck, sheet.progress));
  return masteredWith({ session, out, stems, take: sheet.take() })(tape);
});

export const song: Song = dawSongOf({
  work,
  form: program,
  look: {
    hues: {
      KICK: 48,
      SNARE: 70,
      HATS: 95,
      BREAK: 125,
      PERC: 155,
      SUB: 275,
      BASS: 300,
      RHODES: 28,
      VIBES: 195,
      STRINGS: 225,
      GLASS: 250,
      "VOX F": 350,
      "VOX M": 12,
      FX: 325,
      EDIT: 0,
    },
    tones: { EDIT: "ink" },
  },
  sampleUrls: samplesIn(
    import.meta.glob<string>("./samples/*.flac", { query: "?url", import: "default", eager: true }),
  ),
  sampleRate: engine.SR,
  render: rendered,
});
