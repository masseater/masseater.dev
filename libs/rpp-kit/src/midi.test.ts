import { expect, test } from "vite-plus/test";

import { midiNotes } from "./midi.ts";
import type { MidiClip } from "./midi.ts";
import { parseRpp } from "./parse.ts";

const MIXED_SOURCE = `<SOURCE MIDI
  HASDATA 1 960 QN
  E 0 90 3c 64
  E 480 80 3c 00
  <X 480 0 0 0 3 "Bass"
    /wNCYXNz
  >
  Em 0 90 3e 64
  Em 480 80 3e 00
  e 0 90 40 64
  e 480 80 40 00
  <xm 480 0
    /wNCYXNz
  >
>
`;

const MUTED_OFF_SOURCE = `<SOURCE MIDI
  HASDATA 1 960 QN
  E 0 90 3c 64
  Em 480 80 3c 00
  E 480 80 3c 00
>
`;

const clipOf = (source: string): MidiClip => {
  const parsed = parseRpp(source);
  if (parsed.status === "error") {
    throw new Error(parsed.error.message);
  }
  return midiNotes(parsed.root);
};

test("ミュートしたイベントと拡張イベントは鳴らさず、その分だけ時間を進める", () => {
  expect(clipOf(MIXED_SOURCE)).toStrictEqual({
    notes: [
      { pitch: 60, velocity: 100, start: 0, end: 0.5 },
      { pitch: 64, velocity: 100, start: 1.5, end: 2 },
    ],
    length: 2.5,
  });
});

test("ミュートしたノートオフは、鳴っているノートを閉じない", () => {
  expect(clipOf(MUTED_OFF_SOURCE)).toStrictEqual({
    notes: [{ pitch: 60, velocity: 100, start: 0, end: 1 }],
    length: 1,
  });
});
