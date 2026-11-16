import { Array as Arr, Option, pipe } from "effect";

import { rollScaleOf } from "./layout.ts";
import { pageTarget } from "./metrics.ts";
import { keyboardWidth } from "./roll-layout.ts";
import type { Scroller } from "./scroller.ts";
import type { Shell } from "./shell.ts";
import { STEPS_PER_BAR, barSeconds, totalBars } from "./song.ts";
import type { Automation } from "./song.ts";
import { mark, say } from "./stage-text.ts";
import { hertz, level } from "./text.ts";
import { firstFrom } from "./tracks.ts";
import type { Track } from "./tracks.ts";

const NONE = 0;
const ONE = 1;
const SHIFT_DECIMALS = 2;
const JUST_AFTER = 1e-4;
const FLASH = 0.09;

const turn = (scroller: Scroller, target: Option.Option<number>): void => {
  if (Option.isSome(target)) {
    scroller.moveTo(target.value);
  }
};

const limitOf = ({ node }: Scroller): number => node.scrollWidth - node.clientWidth;

export const follow =
  ({ scrollers, structure, model }: Shell) =>
  (time: number): void => {
    const current = model.read();
    const page = { bar: time / barSeconds(structure), bars: totalBars(structure) };
    const { width } = current.metrics.roll;
    if (current.follow) {
      turn(
        scrollers.arrange,
        pageTarget({
          ...page,
          scale: current.scale,
          width: current.metrics.arrange.width,
          limit: limitOf(scrollers.arrange),
        }),
      );
      turn(
        scrollers.roll,
        pageTarget({
          ...page,
          scale: rollScaleOf(current),
          width: width - keyboardWidth(width),
          limit: limitOf(scrollers.roll),
        }),
      );
    }
  };

const flashes = (track: Track, time: number): boolean =>
  pipe(
    Arr.get(track.events, firstFrom(time + JUST_AFTER)(track.events) - ONE),
    Option.exists((event) => time - event.start < FLASH),
  );

const valueAt = (automation: Automation, step: number): string => {
  const index = Math.min(Math.max(NONE, step), automation.values.length - ONE);
  const value = automation.values[index] ?? NONE;
  if (automation.unit === "Hz") {
    return hertz(value);
  }
  return level(value);
};

export const paintHeads =
  ({ parts, structure, model, transport }: Shell) =>
  (time: number): void => {
    const { session, scale } = model.read();
    const { heads, playhead } = parts.tracks;
    const bars = time / barSeconds(structure);
    playhead.style.transform = `translateX(${(bars * scale).toFixed(SHIFT_DECIMALS)}px)`;
    const buttons = [...heads.querySelectorAll<HTMLElement>("button[data-track]")];
    for (const [track, button] of Arr.zip(session.tracks, buttons)) {
      mark(button)(
        "data-lit",
        String(transport.playing() && track.audible && flashes(track, time)),
      );
    }
    const values = [...heads.querySelectorAll<HTMLElement>("[data-automation] > span:last-child")];
    for (const [lane, value] of Arr.zip(session.lanes, values)) {
      say(value)(valueAt(lane.automation, Math.round(bars * STEPS_PER_BAR)));
    }
  };
