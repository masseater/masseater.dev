import { Array as Arr, Record as Rec, pipe } from "effect";

import { SAMPLE_RATE } from "#/entities/song/lib/dsp/number.ts";
import { SampleTableSchema } from "#/entities/song/lib/studio/placement.ts";
import { scoreOf } from "#/entities/song/lib/studio/score.ts";
import { samplesIn } from "#/entities/song/model/daw.ts";
import type { Recording } from "#/entities/song/model/daw.ts";

import { FORM } from "./engine/score.ts";
import samples from "./samples.json";
import { work } from "./work.ts";

export const table = scoreOf(SampleTableSchema)("samples", samples);

const texts = import.meta.glob<string>("./score/clips.jsonl", {
  query: "?raw",
  import: "default",
  eager: true,
});

export const clipsText = pipe(Rec.values(texts), Arr.join(""));

export const recorded: Omit<Recording, "render"> = {
  work,
  form: FORM,
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
  sampleRate: SAMPLE_RATE,
};
