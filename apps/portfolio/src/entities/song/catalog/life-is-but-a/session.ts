import form from "#/entities/song/catalog/life-is-but-a/score/form.json";
import { SAMPLE_RATE } from "#/entities/song/lib/dsp/number.ts";
import { scoreOf } from "#/entities/song/lib/studio/score.ts";
import { samplesIn } from "#/entities/song/model/daw.ts";
import type { Recording } from "#/entities/song/model/daw.ts";
import { FormSchema } from "#/entities/song/model/form.ts";

import { SampleTableSchema } from "./engine/context.ts";
import samples from "./samples.json";
import { work } from "./work.ts";

export const table = scoreOf(SampleTableSchema)("samples", samples);

export const recorded: Omit<Recording, "render"> = {
  work,
  form: scoreOf(FormSchema)("form", form),
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
  sampleRate: SAMPLE_RATE,
};
