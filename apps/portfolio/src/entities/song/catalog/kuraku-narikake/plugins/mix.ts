import type { Mix, MixPlugin, MixRequest } from "@masseater.dev/fumx-studio/plugin/plugin";
import { Effect, Option, pipe } from "effect";

import { lanesOf } from "./mix/automation.ts";
import { editsLogged } from "./mix/cut-ups.ts";
import { deckFor } from "./mix/deck.ts";
import { kurakuOf } from "./mix/kuraku.ts";
import { liveOf } from "./mix/live.ts";
import { deckMastered } from "./mix/master.ts";
import { renderTracks } from "./mix/tracks.ts";

const mixed = Effect.fn("kuraku.mix")(function* mixed(request: MixRequest) {
  const kuraku = kurakuOf(request);
  editsLogged(kuraku);
  const { frames } = kuraku;
  const held = yield* deckFor(frames);
  yield* renderTracks({ kuraku, held, progress: request.progress });
  const out = yield* deckMastered({
    frames,
    drums: held.drums,
    deck: held.deck,
    progress: request.progress,
  });
  const mix: Mix = {
    left: out.left,
    right: out.right,
    stems: [],
    stages: [],
    lanes: lanesOf(kuraku),
    live: pipe(held.tape, Option.map(liveOf({ out, drums: held.drums }))),
  };
  return mix;
});

export const plugin: MixPlugin = { kind: "mix", mix: mixed };
