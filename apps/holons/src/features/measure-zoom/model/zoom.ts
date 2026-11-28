import {
  Array as Arr,
  Match,
  Number as Num,
  Option,
  Record as Rec,
  String as Str,
  pipe,
} from "effect";

import type { ReceivedInput } from "./recording.ts";

const WHEEL_PER_PIXEL = 0.0018;
const PINCH_PER_PIXEL = 0.01;
const DOUBLE_CLICK_FACTOR = 2.5;
const BUTTON_FACTOR = 1.8;
const MIN_WIDTH = 14;
const UNZOOMED = 1;
const WIDTH_INDEX = 2;
const NO_WIDTH = 0;

export type ZoomInput =
  | Readonly<{ kind: "wheel"; deltaY: number; ctrlKey: boolean }>
  | Readonly<{ kind: "dblclick" }>
  | Readonly<{ kind: "zoomIn" }>
  | Readonly<{ kind: "zoomOut" }>
  | Readonly<{ kind: "reset" }>;

const perPixel = (ctrlKey: boolean): number =>
  Match.value(ctrlKey).pipe(
    Match.when(true, () => PINCH_PER_PIXEL),
    Match.orElse(() => WHEEL_PER_PIXEL),
  );

const zoomAfter = (zoom: number, input: ZoomInput, maximum: number): number =>
  Match.value(input).pipe(
    Match.discriminatorsExhaustive("kind")({
      wheel: ({ deltaY, ctrlKey }) => zoom * Math.exp(-deltaY * perPixel(ctrlKey)),
      dblclick: () => zoom * DOUBLE_CLICK_FACTOR,
      zoomIn: () => zoom * BUTTON_FACTOR,
      zoomOut: () => zoom / BUTTON_FACTOR,
      reset: () => UNZOOMED,
    }),
    Num.clamp({ minimum: UNZOOMED, maximum }),
  );

export const expectedZoom = ({
  inputs,
  fullWidth,
}: Readonly<{ inputs: readonly ZoomInput[]; fullWidth: number }>): number =>
  pipe(
    inputs,
    Arr.scan(UNZOOMED, (zoom, input) => zoomAfter(zoom, input, fullWidth / MIN_WIDTH)),
    Arr.lastNonEmpty,
  );

const BUTTONS: Readonly<Record<string, ZoomInput>> = {
  zin: { kind: "zoomIn" },
  zout: { kind: "zoomOut" },
  zall: { kind: "reset" },
};

const zoomInputOf = (input: ReceivedInput): readonly ZoomInput[] =>
  Match.value(input.type).pipe(
    Match.when("wheel", (): readonly ZoomInput[] => [
      { kind: "wheel", deltaY: input.deltaY, ctrlKey: input.ctrlKey },
    ]),
    Match.when("dblclick", (): readonly ZoomInput[] => [{ kind: "dblclick" }]),
    Match.when("click", () => Arr.fromOption(Rec.get(BUTTONS, input.target))),
    Match.orElse(() => []),
  );

export const zoomInputsOf = (received: readonly ReceivedInput[]): readonly ZoomInput[] =>
  pipe(received, Arr.flatMap(zoomInputOf));

export const widthOf = (viewBox: string): Option.Option<number> =>
  pipe(
    viewBox,
    Str.trim,
    Str.split(/[\s,]+/u),
    Arr.get(WIDTH_INDEX),
    Option.map(Number),
    Option.filter((width) => width > NO_WIDTH),
  );

export const zoomOf = ({
  viewBox,
  fullWidth,
}: Readonly<{ viewBox: string; fullWidth: number }>): Option.Option<number> =>
  pipe(
    widthOf(viewBox),
    Option.map((width) => fullWidth / width),
  );
