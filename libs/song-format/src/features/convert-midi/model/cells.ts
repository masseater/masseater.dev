import { Array as Arr, Option, String as Str, pipe } from "effect";
import { Midi } from "tonal";

import type { From } from "#/shared/lib/from.ts";
import { fractionOf } from "#/shared/lib/ticks.ts";

const NONE = 0;
const FULL = 127;
const SHARE_DECIMALS = 3;
const SEMITONE_DECIMALS = 12;
const LAST = 1;

export interface Cell {
  readonly head: string;
  readonly attributes: readonly string[];
  readonly length: number;
}

export const durationText: From<number, string> = (length) => {
  if (length === NONE) {
    return "0/1";
  }
  return fractionOf(length);
};

export const restCell: From<number, Cell> = (length) => ({ head: "rest", attributes: [], length });

export const restsOf: From<number, readonly Cell[]> = (length) => {
  if (length > NONE) {
    return [restCell(length)];
  }
  return [];
};

const isRest: From<Cell, boolean> = (cell) => cell.head === "rest";

const mergeRests = (merged: readonly Cell[], cell: Cell): readonly Cell[] =>
  pipe(
    Arr.last(merged),
    Option.filter((previous) => isRest(previous) && isRest(cell)),
    Option.match({
      onNone: () => [...merged, cell],
      onSome: (previous) => [
        ...Arr.dropRight(merged, LAST),
        restCell(previous.length + cell.length),
      ],
    }),
  );

const NO_CELLS: readonly Cell[] = [];

const cellText: From<Cell, string> = (cell) =>
  Arr.join([cell.head, durationText(cell.length), ...cell.attributes], " ");

export const cellsText: From<readonly Cell[], string> = (cells) =>
  pipe(Arr.reduce(cells, NO_CELLS, mergeRests), Arr.map(cellText), Arr.join(", "));

export const quoted: From<string, string> = (text) =>
  `"${pipe(
    text,
    Str.replaceAll("\\", String.raw`\\`),
    Str.replaceAll('"', String.raw`\"`),
    Str.replaceAll("\n", String.raw`\n`),
    Str.replaceAll("\r", String.raw`\r`),
    Str.replaceAll("\t", String.raw`\t`),
  )}"`;

export const shareText: From<number, string> = (value) =>
  String(Number((value / FULL).toFixed(SHARE_DECIMALS)));

export const semitoneText: From<number, string> = (value) => {
  const text = String(Number(value.toFixed(SEMITONE_DECIMALS)));
  if (value > NONE) {
    return `+${text}st`;
  }
  return `${text}st`;
};

export const pitchText: From<number, string> = (midi) =>
  Midi.midiToNoteName(midi, { sharps: true });
