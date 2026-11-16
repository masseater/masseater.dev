import { Array as Arr, Option, pipe } from "effect";
import { describe, expect, it } from "vite-plus/test";

import { UNMIXED, audible, heardMixers, mixingOf, toggled } from "./mixing.ts";

const QUIET = -6;
const LEFT = -0.5;
const KEYS = 2;

const mixing = mixingOf({ KEYS: { volumeDecibels: QUIET, pan: LEFT, muted: false } })([
  "DRUMS",
  "BASS",
  "KEYS",
]);
const muted = toggled({ name: "BASS", flip: "mute" })(mixing);
const soloed = toggled({ name: "KEYS", flip: "solo" })(muted);

const silenced = (state: typeof mixing): readonly boolean[] =>
  pipe(
    heardMixers(state),
    Arr.map((mixer) => mixer.muted),
  );

describe("a mix", () => {
  it("plays every track until one is muted or soloed", () => {
    expect(silenced(mixing)).toStrictEqual([false, false, false]);
    expect(silenced(muted)).toStrictEqual([false, true, false]);
  });

  it("plays only the soloed tracks, and a muted track stays silent", () => {
    expect(silenced(soloed)).toStrictEqual([true, true, false]);
    const both = toggled({ name: "BASS", flip: "solo" })(soloed);
    expect(silenced(both)).toStrictEqual([true, true, false]);
  });

  it("keeps the volume and pan the song gave a track", () => {
    const keys = Option.getOrNull(Arr.get(heardMixers(soloed), KEYS));
    expect(keys).toStrictEqual({
      volumeDecibels: QUIET,
      pan: LEFT,
      muted: false,
    });
  });

  it("turns a switch off when it is pressed again", () => {
    expect(toggled({ name: "BASS", flip: "mute" })(muted)).toStrictEqual(mixing);
  });

  it("leaves tracks the mixer does not carry audible and unswitchable", () => {
    expect(audible(soloed)("EDIT")).toBe(true);
    expect(toggled({ name: "EDIT", flip: "mute" })(mixing)).toBe(mixing);
    expect(audible(UNMIXED)("BASS")).toBe(true);
  });
});
