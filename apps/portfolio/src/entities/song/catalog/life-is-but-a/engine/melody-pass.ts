import { Effect } from "effect";

import { keysBus } from "./keys-bus.ts";
import { STAGES, played } from "./stages.ts";
import type { Ducked } from "./stages.ts";
import { voiceBus } from "./voice-bus.ts";

const KEY_TRACKS = [
  ["ORGAN", false],
  ["FM PIANO", false],
  ["PAD", false],
] as const;
const VOICE_TRACKS = [["VOICES", false]] as const;

export const melodyPass = Effect.fn("life.melody")(function* melodyPass({
  life,
  main,
  duck,
  reach,
}: Ducked) {
  yield* reach(STAGES.organ);
  played(life)(KEY_TRACKS, "organ");
  yield* reach(STAGES.keysBus);
  keysBus(life)({ main, duck });
  yield* reach(STAGES.voices);
  played(life)(VOICE_TRACKS, "voices");
  yield* reach(STAGES.voicesBus);
  voiceBus(life)({ main, duck });
});
