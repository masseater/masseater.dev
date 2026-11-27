import { Array as Arr, Number as Num, pipe } from "effect";

import type { TimedLine } from "#/entities/cut/index.ts";
import type { Format } from "#/shared/config/index.ts";
import { Timing } from "#/shared/config/index.ts";
import { plainOf } from "#/shared/lib/segment.ts";

import type { Issue } from "./issue.ts";
import { issueIf, cutError } from "./issue.ts";

const CAPTION_LIMIT: Readonly<Record<Format, number>> = { vertical: 32, horizontal: 56 };
const ASCII = /[\u0020-\u007E]/u;
const NARROW = 0.5;
const WIDE = 1;
const DIGITS = 1;

const widthOf = (character: string): number => {
  if (ASCII.test(character)) {
    return NARROW;
  }
  return WIDE;
};

const readingLength = (text: string): number =>
  pipe(Arr.fromIterable(text), Arr.map(widthOf), (widths) => Num.sumAll(widths));

export interface LineCheck {
  readonly cut: string;
  readonly format: Format;
  readonly fps: number;
  readonly timed: TimedLine;
}

export const lineIssues = ({ cut, format, fps, timed }: LineCheck): readonly Issue[] => {
  const text = plainOf(timed.segments);
  const speed = readingLength(text) / (timed.duration / fps);
  return [
    ...issueIf({
      failed: text.length > CAPTION_LIMIT[format],
      issue: () =>
        cutError({
          cut,
          message: `${format} の字幕「${text}」が ${String(CAPTION_LIMIT[format])} 文字を超えている`,
        }),
    }),
    ...issueIf({
      failed: speed > Timing.MAX_CHARACTERS_PER_SECOND,
      issue: () =>
        cutError({
          cut,
          message: `「${text}」が 1 秒 ${speed.toFixed(DIGITS)} 文字で速すぎる。文を短くする`,
        }),
    }),
  ];
};
