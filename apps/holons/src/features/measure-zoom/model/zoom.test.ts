import { Option } from "effect";
import { describe, expect, test } from "vite-plus/test";

import type { ReceivedInput } from "./recording.ts";
import { expectedZoom, zoomInputsOf, zoomOf } from "./zoom.ts";

const FULL_WIDTH = 2100;
const MIN_WIDTH = 14;
const NOTCH = -120;
const NOTCHES = 9;
const NINE_NOTCHES = 6.987;
const DIGITS = 3;
const DOUBLE_CLICKS = 20;
const UNZOOMED = 1;
const SEVEN_TIMES = 7;
const STILL = 0;

const wheel = { kind: "wheel", deltaY: NOTCH, ctrlKey: false } as const;

const received = (type: string, target: string, deltaY: number): ReceivedInput => ({
  type,
  target,
  deltaY,
  ctrlKey: false,
  firedAt: STILL,
  handledAt: STILL,
});

describe("expectedZoom", () => {
  test("ホイール 9 回の -120 で約 7 倍になる", () => {
    const inputs = Array.from({ length: NOTCHES }, () => wheel);
    expect(expectedZoom({ inputs, fullWidth: FULL_WIDTH })).toBeCloseTo(NINE_NOTCHES, DIGITS);
  });

  test("全体表示より引かず、最小幅より寄らず、全体ボタンで 1 に戻る", () => {
    const dblclicks = Array.from({ length: DOUBLE_CLICKS }, () => ({ kind: "dblclick" }) as const);
    expect({
      out: expectedZoom({ inputs: [{ kind: "zoomOut" }], fullWidth: FULL_WIDTH }),
      deepest: expectedZoom({ inputs: dblclicks, fullWidth: FULL_WIDTH }),
      reset: expectedZoom({ inputs: [wheel, { kind: "reset" }], fullWidth: FULL_WIDTH }),
    }).toStrictEqual({ out: UNZOOMED, deepest: FULL_WIDTH / MIN_WIDTH, reset: UNZOOMED });
  });
});

describe("zoomInputsOf", () => {
  test("ページが受け取った入力を、拡大縮小に効くものだけにする", () => {
    expect(
      zoomInputsOf([
        received("wheel", "map", NOTCH),
        received("click", "map", STILL),
        received("dblclick", "map", STILL),
        received("click", "zin", STILL),
        received("click", "zall", STILL),
      ]),
    ).toStrictEqual([wheel, { kind: "dblclick" }, { kind: "zoomIn" }, { kind: "reset" }]);
  });
});

describe("zoomOf", () => {
  test("viewBox の幅で全体の幅を割り、幅が読めなければ none を返す", () => {
    expect({
      zoomed: zoomOf({ viewBox: "10 20 300 172.857", fullWidth: FULL_WIDTH }),
      broken: zoomOf({ viewBox: "", fullWidth: FULL_WIDTH }),
    }).toStrictEqual({ zoomed: Option.some(SEVEN_TIMES), broken: Option.none() });
  });
});
