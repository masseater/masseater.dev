import { Array as Arr, Option, pipe } from "effect";

import { beatBars, fontOf, leftOf, rules, sixteenthBars, visibleBars } from "./pen.ts";
import type { Pen } from "./pen.ts";
import { centerOf } from "./roll-layout.ts";
import type { Keys, RollLayout } from "./roll-layout.ts";
import { STEPS_PER_BEAT } from "./song.ts";
import { isBlackKey, pitchClass, pitchName } from "./text.ts";

const DETAIL = { sixteenths: 110, beats: 36, numbers: 28, roots: 60, beatLabels: 200 } as const;
const ALPHA = { beat: 0.7, bar: 0.55 } as const;
const HEADER = { font: 9, pad: 4, baseline: 10.5 } as const;
const PHRASE = 4;
const SEPARATOR = 3;
const C_CLASS = 0;
const NONE = 0;
const ONE = 1;
const TWO = 2;
const OPAQUE = 1;
const HAIRLINE = 1;

export interface Roll {
  readonly pen: Pen;
  readonly layout: RollLayout;
}

const keyRow = ({ pen }: Roll, keys: Keys, pitch: number): void => {
  const top = centerOf(keys)(pitch) - keys.row / TWO;
  const width = pen.width - pen.origin;
  if (isBlackKey(pitch)) {
    pen.context.fillStyle = pen.theme.lane;
    pen.context.fillRect(pen.origin, top, width, keys.row);
  }
  if (pitchClass(pitch) === C_CLASS) {
    pen.context.fillStyle = pen.theme.line;
    pen.context.fillRect(pen.origin, Math.round(top + keys.row), width, HAIRLINE);
  }
};

const stripes = ({ pen, layout }: Roll): void => {
  pen.context.fillStyle = pen.theme.lane;
  for (const index of layout.rows.keys()) {
    if (index % TWO === ONE) {
      const top = layout.rowsTop + index * layout.rowHeight;
      pen.context.fillRect(pen.origin, top, pen.width - pen.origin, layout.rowHeight);
    }
  }
};

export const rows = (roll: Roll): void => {
  const { keys } = roll.layout;
  if (Option.isSome(keys)) {
    for (const pitch of Arr.range(keys.value.low, keys.value.high)) {
      keyRow(roll, keys.value, pitch);
    }
  }
  stripes(roll);
};

const fine = ({ pen, layout }: Roll): void => {
  pen.context.fillStyle = pen.theme.grid;
  if (pen.scale >= DETAIL.sixteenths) {
    rules(pen)(layout.top, sixteenthBars(pen));
  }
  pen.context.fillStyle = pen.theme.line;
  pen.context.globalAlpha = ALPHA.beat;
  if (pen.scale >= DETAIL.beats) {
    rules(pen)(layout.top, beatBars(pen));
  }
  pen.context.globalAlpha = OPAQUE;
};

const rootOf = (pen: Pen, bar: number, roots: readonly number[]): string =>
  pipe(
    Arr.get(roots, bar),
    Option.filter(() => pen.scale >= DETAIL.roots),
    Option.match({ onNone: () => "", onSome: (root) => `  ${pitchName(root)}` }),
  );

const beatLabels = (pen: Pen, bar: number): void => {
  for (const beat of Arr.range(ONE, STEPS_PER_BEAT - ONE)) {
    const left = leftOf(pen)(bar + beat / STEPS_PER_BEAT) + HEADER.pad;
    pen.context.fillText(`${bar + ONE}.${beat + ONE}`, left, HEADER.baseline);
  }
};

const barLabel = (pen: Pen, bar: number, roots: readonly number[]): void => {
  const left = Math.round(leftOf(pen)(bar)) + HEADER.pad;
  pen.context.fillText(`${bar + ONE}${rootOf(pen, bar, roots)}`, left, HEADER.baseline);
  if (pen.scale >= DETAIL.beatLabels) {
    beatLabels(pen, bar);
  }
};

const labelled = (pen: Pen, bar: number): boolean =>
  bar < pen.structure.bars && (pen.scale >= DETAIL.numbers || bar % PHRASE === NONE);

const bars = (pen: Pen, roots: readonly number[]): void => {
  pen.context.font = fontOf(pen)(HEADER.font);
  pen.context.fillStyle = pen.theme.dim;
  pen.context.globalAlpha = ALPHA.bar;
  rules(pen)(NONE, visibleBars(pen));
  pen.context.globalAlpha = OPAQUE;
  for (const bar of visibleBars(pen)) {
    if (labelled(pen, bar)) {
      barLabel(pen, bar, roots);
    }
  }
};

const borders = ({ pen, layout }: Roll): void => {
  const width = pen.width - pen.origin;
  pen.context.fillStyle = pen.theme.line;
  pen.context.fillRect(pen.origin, layout.top - HAIRLINE, width, HAIRLINE);
  if (Option.isSome(layout.keys) && Arr.isReadonlyArrayNonEmpty(layout.rows)) {
    pen.context.fillRect(pen.origin, layout.rowsTop - SEPARATOR, width, HAIRLINE);
  }
};

export const grid =
  (roll: Roll) =>
  (roots: readonly number[]): void => {
    fine(roll);
    bars(roll.pen, roots);
    borders(roll);
  };
