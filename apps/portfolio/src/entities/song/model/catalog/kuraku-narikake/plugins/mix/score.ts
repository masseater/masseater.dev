import { scoreOf } from "@masseater.dev/fumx-studio/studio/score";

import automation from "#/entities/song/model/catalog/kuraku-narikake/plugins/mix/score/automation.json";
import cues from "#/entities/song/model/catalog/kuraku-narikake/plugins/mix/score/cues.json";
import sections from "#/entities/song/model/catalog/kuraku-narikake/plugins/mix/score/sections.json";
import tracks from "#/entities/song/model/catalog/kuraku-narikake/plugins/mix/score/tracks.json";

import { AutomationSchema, CuesSchema, MixSchema, SectionsSchema } from "./score-schema.ts";

export const CUES = scoreOf(CuesSchema)("cues", cues);

export const AUTOMATION = scoreOf(AutomationSchema)("automation", automation);

export const SECTIONS = scoreOf(SectionsSchema)("sections", sections);

export const MIX = scoreOf(MixSchema)("tracks", tracks);
