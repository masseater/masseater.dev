import type { Rendered, Samples } from "@masseater.dev/daw-view";
import { Effect } from "effect";

import type { Sheet } from "#/entities/song/model/take.ts";
import { tapeFor } from "#/entities/song/model/tape.ts";

import { heldOn } from "./deck.ts";
import type { Kuraku } from "./engine/kuraku.ts";
import { FRAMES } from "./engine/kuraku.ts";
import { mastered } from "./engine/master.ts";
import { MIX } from "./engine/score.ts";
import { finished } from "./live.ts";
import { renderTracks } from "./tracks.ts";

export interface Mixdown {
  readonly kuraku: Kuraku;
  readonly samples: Samples;
  readonly sheet: Sheet;
  readonly clips: string;
}

export const mixedDown = Effect.fn("kuraku.mixdown")(function* mixedDown({
  kuraku,
  samples,
  sheet,
  clips,
}: Mixdown) {
  const tape = yield* tapeFor({ tracks: MIX.order.length, frames: FRAMES });
  const held = heldOn(FRAMES)(tape);
  yield* renderTracks({ kuraku, clips, samples, sheet, held });
  const out = yield* mastered({
    frames: FRAMES,
    drums: held.drums,
    deck: held.deck,
    progress: sheet.progress,
  });
  const rendered: Rendered = finished({ out, drums: held.drums, take: sheet.take() })(tape);
  return rendered;
});
