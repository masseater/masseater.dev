import { describe, expect, it } from "@effect/vitest";
import type { MediaUtilsAudioData } from "@remotion/media-utils";
import { Array as Arr, Option, pipe } from "effect";

import { volumeMouthState } from "./volume-mouth.ts";
import type { VolumeMouth } from "./volume-mouth.ts";

const FPS = 30;
const SAMPLE_RATE = 48_000;
const TONE_HERTZ = 300;
const AMPLITUDE = 0.5;
const LOUD_FROM = 0.5;
const SILENT_FRAMES = 10;
const LAST_FRAMES = 5;
const ONE_STEP = 1;
const TURN = Math.PI + Math.PI;

const toneAfterSilence = (): MediaUtilsAudioData => {
  const wave = Float32Array.from({ length: SAMPLE_RATE }, (_unused, sample) => {
    const time = sample / SAMPLE_RATE;
    return Number(time >= LOUD_FROM) * AMPLITUDE * Math.sin(TURN * TONE_HERTZ * time);
  });
  return {
    channelWaveforms: [wave],
    sampleRate: SAMPLE_RATE,
    durationInSeconds: 1,
    numberOfChannels: 1,
    resultId: "tone-after-silence",
    isRemote: false,
  };
};

const mouth: VolumeMouth = { kind: "volume-mouth", closed: "閉", half: "半", open: "開" };
const audio = toneAfterSilence();

const states = Arr.makeBy(FPS, (frame) =>
  volumeMouthState({
    mouth,
    speech: Option.some({ frame, fps: FPS, phonemes: [], audio: Option.some(audio) }),
  }),
);

describe("volumeMouthState", () => {
  it("keeps the mouth closed while the voice is silent", () => {
    expect(Arr.take(states, SILENT_FRAMES)).toStrictEqual(Arr.makeBy(SILENT_FRAMES, () => "閉"));
  });

  it("opens the mouth one step per loud frame", () => {
    const half = Arr.findFirstIndex(states, (state) => state === "半");
    const open = Arr.findFirstIndex(states, (state) => state === "開");
    expect(Option.all([half, open]).pipe(Option.map(([from, to]) => to - from))).toStrictEqual(
      Option.some(ONE_STEP),
    );
  });

  it("stays open while the voice stays loud", () => {
    expect(pipe(states, Arr.takeRight(LAST_FRAMES))).toStrictEqual(
      Arr.makeBy(LAST_FRAMES, () => "開"),
    );
  });
});
