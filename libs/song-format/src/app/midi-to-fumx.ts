import { Effect } from "effect";

import { midiToFumx } from "#/features/convert-midi/index.ts";
import type { MidiFile } from "#/features/convert-midi/index.ts";

import { roundTrip } from "./round-trip.ts";

export interface MidiSource extends MidiFile {
  readonly path: string;
}

export const convertMidiFile = Effect.fn("convertMidiFile")(function* convert(source: MidiSource) {
  const fumx = yield* midiToFumx(source);
  return yield* roundTrip(source.path, fumx);
});
