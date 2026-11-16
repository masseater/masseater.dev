import { useAtomSet } from "@effect/atom-react";
import { MutableRef, Option } from "effect";
import { constVoid } from "effect/Function";
import { useCallback, useMemo } from "react";

import { rangeAtom, spanOf } from "#/features/mark-range/model/draft";
import type { Range } from "#/features/mark-range/model/draft";

const DRAG_PIXELS = 4;
const NONE = 0;
const FULL = 1;

type Press = Readonly<{ seconds: number; x: number; dragged: boolean }>;

type Scrubbing = Readonly<{
  element: HTMLDivElement;
  duration: number;
  seek: (seconds: number) => void;
  select: (range: Range) => void;
  pressed: () => Option.Option<Press>;
  press: (next: Option.Option<Press>) => void;
}>;

const secondsAt = ({ element, duration }: Scrubbing, x: number): number => {
  const { left, width } = element.getBoundingClientRect();
  return Math.min(Math.max((x - left) / Math.max(width, FULL), NONE), FULL) * duration;
};

const downAt =
  (scrubbing: Scrubbing) =>
  (event: PointerEvent): void => {
    scrubbing.element.setPointerCapture(event.pointerId);
    scrubbing.press(
      Option.some({
        seconds: secondsAt(scrubbing, event.clientX),
        x: event.clientX,
        dragged: false,
      }),
    );
  };

const moved =
  (scrubbing: Scrubbing) =>
  (event: PointerEvent): void => {
    const press = scrubbing.pressed();
    if (Option.isNone(press)) {
      return;
    }
    const { seconds, x, dragged } = press.value;
    if (dragged || Math.abs(event.clientX - x) >= DRAG_PIXELS) {
      scrubbing.press(Option.some({ seconds, x, dragged: true }));
      scrubbing.select(spanOf([seconds, secondsAt(scrubbing, event.clientX)]));
    }
  };

const released =
  (scrubbing: Scrubbing) =>
  (event: PointerEvent): void => {
    const press = scrubbing.pressed();
    if (Option.isSome(press) && !press.value.dragged) {
      scrubbing.seek(secondsAt(scrubbing, event.clientX));
    }
    scrubbing.press(Option.none());
  };

const listen = (scrubbing: Scrubbing): (() => void) => {
  const down = downAt(scrubbing);
  const move = moved(scrubbing);
  const up = released(scrubbing);
  scrubbing.element.addEventListener("pointerdown", down);
  scrubbing.element.addEventListener("pointermove", move);
  scrubbing.element.addEventListener("pointerup", up);
  return (): void => {
    scrubbing.element.removeEventListener("pointerdown", down);
    scrubbing.element.removeEventListener("pointermove", move);
    scrubbing.element.removeEventListener("pointerup", up);
  };
};

export const useScrub = ({
  duration,
  seek,
}: Readonly<{ duration: number; seek: (seconds: number) => void }>): ((
  element: HTMLDivElement | null,
) => () => void) => {
  const setRange = useAtomSet(rangeAtom);
  const press = useMemo(() => MutableRef.make(Option.none<Press>()), []);
  return useCallback(
    (element: HTMLDivElement | null): (() => void) =>
      Option.match(Option.fromNullishOr(element), {
        onNone: () => constVoid,
        onSome: (found) =>
          listen({
            element: found,
            duration,
            seek,
            pressed: () => MutableRef.get(press),
            press: (next) => {
              MutableRef.set(press, next);
            },
            select: (range) => {
              setRange(Option.some(range));
            },
          }),
      }),
    [duration, seek, setRange, press],
  );
};
