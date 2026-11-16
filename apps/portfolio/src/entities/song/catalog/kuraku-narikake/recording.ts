import type { RenderSession, Song } from "@masseater.dev/daw-view";
import { Effect } from "effect";

import { dawSongOf } from "#/entities/song/model/daw.ts";
import { sheetOf } from "#/entities/song/model/take.ts";

import { openedOn } from "./engine/opened.ts";
import { mixedDown } from "./mixdown.ts";
import { clipsText, recorded, table } from "./session.ts";

const sheetFor = sheetOf("MASTER LP");
const START = 0;

const rendered = Effect.fn("song.kuraku-narikake.render")(function* rendered({
  samples,
  report,
}: Omit<RenderSession, "signal">) {
  const sheet = sheetFor(report);
  const kuraku = openedOn(sheet)({ samples, table, clips: clipsText });
  sheet.progress(START, "tracks");
  return yield* mixedDown({ kuraku, samples, sheet, clips: clipsText });
});

export const song: Song = dawSongOf({ ...recorded, render: rendered });
