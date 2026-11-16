import { describe, expect, it } from "vite-plus/test";

import { UNMIXED, audible, gainsOf, mixingOf, toggled } from "./mixing.ts";

const ON = 1;
const OFF = 0;

const mixing = mixingOf(["DRUMS", "BASS", "KEYS"]);
const muted = toggled({ name: "BASS", flip: "mute" })(mixing);
const soloed = toggled({ name: "KEYS", flip: "solo" })(muted);

describe("a mix", () => {
  it("plays every track until one is muted or soloed", () => {
    expect([...gainsOf(mixing)]).toStrictEqual([ON, ON, ON]);
    expect([...gainsOf(muted)]).toStrictEqual([ON, OFF, ON]);
  });

  it("plays only the soloed tracks, and a muted track stays silent", () => {
    expect([...gainsOf(soloed)]).toStrictEqual([OFF, OFF, ON]);
    const both = toggled({ name: "BASS", flip: "solo" })(soloed);
    expect([...gainsOf(both)]).toStrictEqual([OFF, OFF, ON]);
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
