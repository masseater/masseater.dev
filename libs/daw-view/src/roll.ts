import type { Option } from "effect";

import { clear, leftOf, penOf } from "./pen.ts";
import type { Canvas, Pen, Viewport } from "./pen.ts";
import { grid, rows } from "./roll-grid.ts";
import { keyboard } from "./roll-keys.ts";
import type { RollLayout } from "./roll-layout.ts";
import { notes } from "./roll-notes.ts";
import { soundingAt } from "./roll-pick.ts";
import { barSeconds } from "./song.ts";
import type { NoteEvent } from "./song.ts";

const TOP = 0;
const HEAD = { width: 2, half: 1 } as const;

export interface RollFrame {
  readonly canvas: Canvas;
  readonly viewport: Viewport;
  readonly layout: RollLayout;
  readonly roots: readonly number[];
  readonly time: number;
  readonly hover: Option.Option<NoteEvent>;
}

const playhead = (pen: Pen, time: number): void => {
  const left = leftOf(pen)(time / barSeconds(pen.structure));
  if (left >= pen.origin - HEAD.half) {
    pen.context.fillStyle = pen.theme.hot;
    pen.context.fillRect(Math.round(left) - HEAD.half, TOP, HEAD.width, pen.height);
  }
};

const stage = (pen: Pen, frame: RollFrame): void => {
  const roll = { pen, layout: frame.layout };
  pen.context.save();
  pen.context.beginPath();
  pen.context.rect(pen.origin, TOP, pen.width - pen.origin, pen.height);
  pen.context.clip();
  rows(roll);
  grid(roll)(frame.roots);
  notes({ ...roll, time: frame.time, hover: frame.hover });
  playhead(pen, frame.time);
  pen.context.restore();
};

export const drawRoll = (frame: RollFrame): void => {
  const pen = penOf(frame.canvas)(frame.viewport);
  clear(pen);
  stage(pen, frame);
  keyboard({ pen, layout: frame.layout })(soundingAt(frame.layout)(frame.time));
};
