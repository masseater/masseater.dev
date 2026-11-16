import { Effect } from "effect";

import { bassBus } from "./bass-bus.ts";
import { drumBus } from "./drum-bus.ts";
import { STAGES, played } from "./stages.ts";
import type { Pass } from "./stages.ts";

const DRUM_TRACKS = [
  ["FX", false],
  ["PLATE SEND", false],
  ["DELAY SEND", false],
  ["FRONT VOICE", false],
  ["KICK", true],
  ["DRUMS", false],
] as const;
const BASS_TRACKS = [
  ["BASS SUB", true],
  ["BASS MID", true],
] as const;

export const rhythmPass = Effect.fn("life.rhythm")(function* rhythmPass({
  life,
  main,
  reach,
}: Pass) {
  yield* reach(STAGES.drums);
  played(life)(DRUM_TRACKS, "drums");
  yield* reach(STAGES.drumBus);
  const duck = drumBus(life)(main);
  yield* reach(STAGES.bass);
  played(life)(BASS_TRACKS, "bass");
  yield* reach(STAGES.bassFilter);
  bassBus(life)({ main, duck });
  return duck;
});
