import { useAtomSet } from "@effect/atom-react";
import { MutableRef, Option, Record as Rec, pipe } from "effect";
import { constVoid } from "effect/Function";
import { useCallback, useMemo } from "react";

import { rangeAtom, spanOf } from "#/features/select-range/model/range.ts";
import type { Range } from "#/features/select-range/model/range.ts";

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

const down = (scrubbing: Scrubbing, event: PointerEvent): void => {
  scrubbing.element.setPointerCapture(event.pointerId);
  scrubbing.press(
    Option.some({
      seconds: secondsAt(scrubbing, event.clientX),
      x: event.clientX,
      dragged: false,
    }),
  );
};

const move = (scrubbing: Scrubbing, event: PointerEvent): void => {
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

const up = (scrubbing: Scrubbing, event: PointerEvent): void => {
  const press = scrubbing.pressed();
  if (Option.isSome(press) && !press.value.dragged) {
    scrubbing.seek(secondsAt(scrubbing, event.clientX));
  }
  scrubbing.press(Option.none());
};

const POINTER_HANDLERS = {
  pointerdown: down,
  pointermove: move,
  pointerup: up,
} as const;

const listen = (scrubbing: Scrubbing): (() => void) => {
  const bound = pipe(
    POINTER_HANDLERS,
    Rec.map((handle) => (event: PointerEvent): void => {
      handle(scrubbing, event);
    }),
  );
  const entries = Rec.toEntries(bound);
  for (const [type, listener] of entries) {
    scrubbing.element.addEventListener(type, listener);
  }
  return (): void => {
    for (const [type, listener] of entries) {
      scrubbing.element.removeEventListener(type, listener);
    }
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
