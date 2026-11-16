import { Array as Arr, Option, String as Str, pipe } from "effect";

import type { Mark, Section } from "#/entities/song/index.ts";
import { pitchName, RULER_HEIGHT } from "#/entities/song/index.ts";
import {
  beatBars,
  everyBar,
  fitted,
  fontOf,
  leftOf,
  rules,
  sixteenthBars,
  visibleBars,
} from "#/widgets/daw-view/model/pen.ts";
import type { Pen } from "#/widgets/daw-view/model/pen.ts";

const RULER = {
  sections: 14,
  sectionText: 7.5,
  marks: 16,
  markText: 22.5,
  numberText: 38.5,
} as const;
const TICK = 16;
const DETAIL = { sixteenths: 150, beats: 44, bars: 9, roots: 44, numbers: 26 } as const;
const FONT = { small: 9, mark: 10 } as const;
const PAD = 4;
const NUMBER_PAD = 3;
const PHRASE = 4;
const EDGE = 0;
const ONE = 1;
const TWO = 2;
const HAIRLINE = 1;

interface Label {
  readonly text: string;
  readonly start: number;
  readonly end: number;
  readonly baseline: number;
}

const offPhrase = (pen: Pen): readonly number[] =>
  pipe(
    visibleBars(pen),
    Arr.filter((bar) => bar % PHRASE !== EDGE),
  );

const fine = (pen: Pen): void => {
  const draw = rules(pen);
  if (pen.scale >= DETAIL.sixteenths) {
    draw(RULER_HEIGHT, sixteenthBars(pen));
  }
  if (pen.scale >= DETAIL.beats) {
    draw(RULER_HEIGHT, beatBars(pen));
  }
  if (pen.scale >= DETAIL.bars) {
    draw(RULER_HEIGHT - TICK, offPhrase(pen));
  }
};

export const grid = (pen: Pen): void => {
  pen.context.fillStyle = pen.theme.grid;
  fine(pen);
  pen.context.fillStyle = pen.theme.line;
  rules(pen)(RULER_HEIGHT - TICK, everyBar(pen)(PHRASE));
};

const label = (pen: Pen, { text, start, end, baseline }: Label): void => {
  const left = Math.max(start, EDGE) + PAD;
  pen.context.fillText(fitted(pen.context)(text, end - left - PAD), left, baseline);
};

const section =
  (pen: Pen) =>
  (item: Section, index: number): void => {
    const start = leftOf(pen)(item.from);
    const end = leftOf(pen)(item.to);
    if (index % TWO === ONE) {
      pen.context.fillStyle = pen.theme.lane;
      pen.context.fillRect(start, EDGE, end - start, RULER.sections);
    }
    if (end > EDGE && start < pen.width) {
      pen.context.fillStyle = pen.theme.dim;
      label(pen, { text: Str.toUpperCase(item.name), start, end, baseline: RULER.sectionText });
    }
  };

const markEnd = (pen: Pen, index: number): number =>
  pipe(
    Arr.get(pen.structure.marks, index + ONE),
    Option.match({ onNone: () => pen.structure.bars, onSome: (next) => next.bar }),
  );

const mark =
  (pen: Pen) =>
  (item: Mark, index: number): void => {
    const start = leftOf(pen)(item.bar);
    const end = leftOf(pen)(markEnd(pen, index));
    if (end >= EDGE && start <= pen.width) {
      pen.context.fillRect(Math.round(start), RULER.sections, HAIRLINE, RULER.marks);
      label(pen, { text: item.label, start, end, baseline: RULER.markText });
    }
  };

const numberStep = (scale: number): number => {
  let step = ONE;
  while (step * scale < DETAIL.numbers) {
    step *= TWO;
  }
  return step;
};

const root = (pen: Pen, bar: number, roots: readonly number[]): void => {
  const name = pipe(Arr.get(roots, bar), Option.map(pitchName));
  if (Option.isSome(name) && pen.scale >= DETAIL.roots) {
    pen.context.textAlign = "right";
    pen.context.fillText(name.value, leftOf(pen)(bar + ONE) - PAD, RULER.numberText);
    pen.context.textAlign = "left";
  }
};

const numbers = (pen: Pen, roots: readonly number[]): void => {
  pen.context.font = fontOf(pen)(FONT.small);
  pen.context.fillStyle = pen.theme.dim;
  for (const bar of everyBar(pen)(numberStep(pen.scale))) {
    if (bar < pen.structure.bars) {
      pen.context.fillText(String(bar + ONE), leftOf(pen)(bar) + NUMBER_PAD, RULER.numberText);
      root(pen, bar, roots);
    }
  }
};

const borders = (pen: Pen): void => {
  pen.context.fillStyle = pen.theme.line;
  pen.context.fillRect(EDGE, RULER_HEIGHT - HAIRLINE, pen.width, HAIRLINE);
  pen.context.fillRect(EDGE, RULER.sections, pen.width, HAIRLINE);
};

const sections = (pen: Pen): void => {
  pen.context.font = fontOf(pen)(FONT.small);
  for (const [index, item] of pen.structure.sections.entries()) {
    section(pen)(item, index);
  }
};

const marks = (pen: Pen): void => {
  pen.context.font = fontOf(pen)(FONT.mark);
  pen.context.fillStyle = pen.theme.ink;
  for (const [index, item] of pen.structure.marks.entries()) {
    mark(pen)(item, index);
  }
};

export const ruler =
  (pen: Pen) =>
  (roots: readonly number[]): void => {
    sections(pen);
    marks(pen);
    numbers(pen, roots);
    borders(pen);
  };
