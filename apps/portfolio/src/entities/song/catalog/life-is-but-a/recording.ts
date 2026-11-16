import type { RenderSession, Song } from "@masseater.dev/daw-view";
import { Effect, Option, pipe } from "effect";

import { dawSongOf } from "#/entities/song/model/daw.ts";
import { sheetOf } from "#/entities/song/model/take.ts";
import { tapeFor } from "#/entities/song/model/tape.ts";

import { FRAMES } from "./engine/life.ts";
import { render } from "./engine/render.ts";
import { MIXED, finished, sinkOn } from "./live.ts";
import { recorded, table } from "./session.ts";

const sheetFor = sheetOf("WALL LP");

const rendered = Effect.fn("song.life-is-but-a.render")(function* rendered({
  samples,
  report,
}: Omit<RenderSession, "signal">) {
  const sheet = sheetFor(report);
  const tape = yield* tapeFor({ tracks: MIXED.length, frames: FRAMES });
  const out = yield* render({
    samples,
    table,
    log: Option.some(sheet.log),
    tape: pipe(tape, Option.map(sinkOn)),
    progress: sheet.progress,
  });
  sheet.show({ roots: out.roots, auto: out.automation });
  return finished({ out, take: sheet.take() })(tape);
});

export const song: Song = dawSongOf({ ...recorded, render: rendered });
