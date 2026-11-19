import type { RenderSession, Rendered, Structure } from "@masseater.dev/daw-view";
import type { Song } from "@r_masseater/fumx-parser";
import { Effect, Option } from "effect";
import type { Scope } from "effect";

import { renderSong } from "#/features/render-song/index.ts";
import type { Unplayable } from "#/features/render-song/index.ts";
import { rootsOf, structureOf } from "#/features/show-song/index.ts";
import { withLive } from "#/shared/lib/daw/mixdown.ts";
import { sheetOf } from "#/shared/lib/daw/take.ts";
import type { Plugins } from "#/shared/lib/plugin/plugin.ts";

import { liveFor } from "./live.ts";

const UNSHADED = "";

export type RecordingSession = Omit<RenderSession, "signal">;

export interface Recording {
  readonly structure: Structure;
  readonly render: (session: RecordingSession) => Effect.Effect<Rendered, Unplayable, Scope.Scope>;
}

export interface Studio {
  readonly song: Song;
  readonly worklet: string;
  readonly plugins: Plugins;
}

const renderOf = ({ song, worklet, plugins }: Studio): Recording["render"] =>
  Effect.fn("fumx.song")(function* songRendered({ samples, report }: RecordingSession) {
    const sheet = sheetOf(UNSHADED)(report);
    const mastered = yield* renderSong(song, {
      samples,
      plugins,
      log: sheet.log,
      progress: sheet.progress,
    });
    sheet.show({ roots: rootsOf(song), auto: mastered.lanes });
    const live = yield* Option.match(mastered.live, {
      onNone: () => liveFor(worklet)(mastered),
      onSome: (given) => Effect.succeedSome(given),
    });
    const mixdown: Rendered = { left: mastered.left, right: mastered.right, take: sheet.take() };
    return withLive(mixdown)(live);
  });

export const recordingOf = (studio: Studio): Recording => ({
  structure: structureOf(studio.song),
  render: renderOf(studio),
});
