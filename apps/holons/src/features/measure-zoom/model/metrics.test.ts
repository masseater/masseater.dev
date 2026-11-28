import { describe, expect, test } from "vite-plus/test";

import { measurementOf, quantile, summarize } from "./metrics.ts";
import type { Recording } from "./recording.ts";

const FULL_WIDTH = 2100;
const DEVICE_PIXEL_RATIO = 3;
const NOTCH = -120;
const SCALED_NOTCH = -40;
const FIRST_WHEEL_MS = 100;
const SECOND_WHEEL_MS = 120;
const HANDLER_DELAY_MS = 2;
const FRAME_MS = 20;
const COMMIT_FRAME_START_MS = 150;
const COMMIT_FRAME_MS = 150;
const COMMIT_MS = 265;
const BLOCKING_MS = 100;
const FRAME_BEFORE_MS = 90;
const FRAME_AFTER_MS = 320;
const FRAMES = [
  FRAME_BEFORE_MS,
  FRAME_BEFORE_MS + FRAME_MS,
  FRAME_BEFORE_MS + FRAME_MS + FRAME_MS,
  COMMIT_FRAME_START_MS,
  COMMIT_FRAME_START_MS + COMMIT_FRAME_MS,
  FRAME_AFTER_MS,
] as const;
const ZOOM_FROM_SCALED = 1.155;
const ZOOM_FROM_SENT = 1.54;
const RATIO = 0.75;
const MIDDLE = 2;
const HALF = 0.5;
const MEDIAN_ZOOM = 3;
const HIGHEST_ZOOM = 5;

const wheel = (at: number): Recording["inputs"][number] => ({
  type: "wheel",
  target: "map",
  deltaY: SCALED_NOTCH,
  ctrlKey: false,
  firedAt: at,
  handledAt: at + HANDLER_DELAY_MS,
});

const recording: Recording = {
  inputs: [wheel(FIRST_WHEEL_MS), wheel(SECOND_WHEEL_MS)],
  frames: FRAMES,
  entries: [
    {
      entryType: "long-animation-frame",
      name: "long-animation-frame",
      startTime: COMMIT_FRAME_START_MS,
      duration: COMMIT_FRAME_MS,
      blockingDuration: BLOCKING_MS,
    },
  ],
  commits: [{ at: COMMIT_MS, viewBox: "0 0 1818 1047" }],
};

const sentWheel = { kind: "wheel", deltaY: NOTCH, ctrlKey: false } as const;

describe("measurementOf", () => {
  test("届いた deltaY が送った分より小さいと、拡大率の比が 1 を下回る", () => {
    expect(
      measurementOf({
        devicePixelRatio: DEVICE_PIXEL_RATIO,
        recording,
        viewBox: "0 0 1818 1047",
        sent: [sentWheel, sentWheel],
        fullWidth: FULL_WIDTH,
      }),
    ).toMatchObject({
      frameIntervalsMs: [FRAME_MS, FRAME_MS, COMMIT_FRAME_MS],
      frameMaxMs: COMMIT_FRAME_MS,
      commitFrameMs: COMMIT_FRAME_MS,
      blockingMs: BLOCKING_MS,
      inputDelayMaxMs: HANDLER_DELAY_MS,
      deltaYSent: NOTCH + NOTCH,
      deltaYReceived: SCALED_NOTCH + SCALED_NOTCH,
      zoom: ZOOM_FROM_SCALED,
      zoomFromReceived: ZOOM_FROM_SCALED,
      zoomExpected: ZOOM_FROM_SENT,
      zoomRatio: RATIO,
    });
  });
});

describe("summarize", () => {
  test("各値を実行ごとの中央値にする", () => {
    const base = measurementOf({
      devicePixelRatio: DEVICE_PIXEL_RATIO,
      recording,
      viewBox: "0 0 2100 1210",
      sent: [],
      fullWidth: FULL_WIDTH,
    });
    expect({
      quantile: quantile({ values: [MIDDLE + MIDDLE, MIDDLE, MIDDLE - MIDDLE], fraction: HALF }),
      zoom: summarize([base, { ...base, zoom: MEDIAN_ZOOM }, { ...base, zoom: HIGHEST_ZOOM }]).zoom,
    }).toStrictEqual({ quantile: MIDDLE, zoom: MEDIAN_ZOOM });
  });
});
