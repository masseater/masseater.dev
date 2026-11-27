import { Array as Arr, Option, pipe } from "effect";

export interface Blink {
  readonly kind: "blink";
  readonly closed: string;
  readonly almostClosed?: string;
  readonly half?: string;
  readonly almostOpen?: string;
  readonly open: string;
  readonly interval?: number;
  readonly speed?: number;
  readonly offset?: number;
}

const DEFAULT_INTERVAL_SECONDS = 4;
const DEFAULT_SPEED_FRAMES = 1;
const DEFAULT_OFFSET_FRAMES = 0;
const ROUND_TRIP = 2;
const LONG_CYCLE = 5;
const ASYMMETRIC_FROM = 3;
const STEP = 1;

const floorMod = (value: number, divisor: number): number =>
  ((value % divisor) + divisor) % divisor;

export const blinkPatterns = (blink: Blink): readonly string[] => {
  const present = pipe(
    [blink.closed, blink.almostClosed, blink.half, blink.almostOpen, blink.open],
    Arr.flatMap((pattern) => Option.toArray(Option.fromNullishOr(pattern))),
    Arr.filter((pattern) => pattern !== ""),
  );
  if (present.length <= ASYMMETRIC_FROM) {
    return present;
  }
  return [...Option.toArray(Arr.get(present, present.length - ROUND_TRIP)), ...present];
};

export const blinkState = ({
  blink,
  frame,
  fps,
}: Readonly<{ blink: Blink; frame: number; fps: number }>): string => {
  const patterns = blinkPatterns(blink);
  const speed = blink.speed ?? DEFAULT_SPEED_FRAMES;
  const interval =
    (blink.interval ?? DEFAULT_INTERVAL_SECONDS) * fps + speed * patterns.length * ROUND_TRIP;
  const base = frame + interval + (blink.offset ?? DEFAULT_OFFSET_FRAMES);
  const first = floorMod(base, interval);
  const second = floorMod(base + speed * patterns.length, interval * LONG_CYCLE);
  const inside = (position: number, left: number): boolean =>
    left <= position && position < left + speed;
  return pipe(
    patterns,
    Arr.findFirst((_pattern, index) => {
      const left = speed * (index + STEP);
      return inside(first, left) || inside(second, left);
    }),
    Option.orElse(() => Arr.last(patterns)),
    Option.getOrElse(() => ""),
  );
};
