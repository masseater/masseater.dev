import { scoreOf } from "@masseater.dev/fumx-studio/studio/score";
import { Array as Arr, Schema, String as Str, pipe } from "effect";

import automation from "#/entities/song/catalog/kuraku-narikake/score/automation.json";
import cues from "#/entities/song/catalog/kuraku-narikake/score/cues.json";
import form from "#/entities/song/catalog/kuraku-narikake/score/form.json";
import sections from "#/entities/song/catalog/kuraku-narikake/score/sections.json";
import tracks from "#/entities/song/catalog/kuraku-narikake/score/tracks.json";
import { FormSchema } from "#/entities/song/model/form.ts";

import {
  AutomationSchema,
  ClipSchema,
  CuesSchema,
  MixSchema,
  SectionsSchema,
} from "./score-schema.ts";
import type { Clip } from "./score-schema.ts";

export const FORM = scoreOf(FormSchema)("form", form);

export const CUES = scoreOf(CuesSchema)("cues", cues);

export const AUTOMATION = scoreOf(AutomationSchema)("automation", automation);

export const SECTIONS = scoreOf(SectionsSchema)("sections", sections);

export const MIX = scoreOf(MixSchema)("tracks", tracks);

const ClipsSchema = Schema.Array(Schema.fromJsonString(ClipSchema));

export const clipsOf = (text: string): readonly Clip[] =>
  scoreOf(ClipsSchema)("clips", pipe(Str.split(text, "\n"), Arr.filter(Str.isNonEmpty)));
