import type { RenderSession, Rendered, Structure } from "@masseater.dev/daw-view";
import type { Song } from "@r_masseater/fumx-parser";
import { Effect } from "effect";
import type { Scope } from "effect";

import { renderSong } from "#/features/render-song/model/render.ts";
import type { Unplayable } from "#/features/render-song/model/unplayable.ts";
import { withLive } from "#/shared/lib/daw/mixdown.ts";
import { sheetOf } from "#/shared/lib/daw/take.ts";

import { liveFor } from "./live.ts";
import { rootsOf, structureOf } from "./structure.ts";

const UNSHADED = "";

export type RecordingSession = Omit<RenderSession, "signal">;

export interface Recording {
  readonly structure: Structure;
  readonly render: (session: RecordingSession) => Effect.Effect<Rendered, Unplayable, Scope.Scope>;
}

const renderOf =
  (song: Song) =>
  (worklet: string): Recording["render"] =>
    Effect.fn("fumx.song")(function* songRendered({ samples, report }: RecordingSession) {
      const sheet = sheetOf(UNSHADED)(report);
      const mastered = yield* renderSong(song, {
        samples,
        log: sheet.log,
        progress: sheet.progress,
      });
      sheet.show({ roots: rootsOf(song) });
      const live = yield* liveFor(worklet)(mastered);
      const mixdown: Rendered = { left: mastered.left, right: mastered.right, take: sheet.take() };
      return withLive(mixdown)(live);
    });

export const recordingOf =
  (song: Song) =>
  (worklet: string): Recording => ({
    structure: structureOf(song),
    render: renderOf(song)(worklet),
  });
