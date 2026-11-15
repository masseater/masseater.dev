import { Array as Arr, Option, pipe } from "effect";

import { trackColor } from "./color.ts";
import { fitted, fontOf } from "./pen.ts";
import type { Roll } from "./roll-grid.ts";
import { centerOf } from "./roll-layout.ts";
import type { Keys } from "./roll-layout.ts";
import type { Sounding } from "./roll-pick.ts";
import { isBlackKey, noteName, pitchClass } from "./text.ts";

const BLACK_LENGTH = 0.62;
const C_CLASS = 0;
const F_CLASS = 5;
const NAMED_ROW = 4;
const NAMED_LANE = 8;
const FONT = 9;
const PAD = 4;
const NUDGE = 0.5;
const LEFT = 0;
const TOP = 0;
const TWO = 2;
const HAIRLINE = 1;

interface Board extends Roll {
  readonly sounding: Sounding;
}

interface Key {
  readonly pitch: number;
  readonly top: number;
  readonly lit: boolean;
}

const body = ({ pen }: Board, keys: Keys, key: Key): void => {
  if (key.lit) {
    pen.context.fillStyle = pen.theme.hot;
    pen.context.fillRect(LEFT, key.top, pen.origin, keys.row);
  } else if (isBlackKey(key.pitch)) {
    pen.context.fillStyle = pen.theme.keyBlack;
    pen.context.fillRect(LEFT, key.top, pen.origin * BLACK_LENGTH, keys.row);
  }
};

const nameColor = ({ pen }: Board, lit: boolean): string => {
  if (lit) {
    return pen.theme.card;
  }
  return pen.theme.keyBlack;
};

const octave = (board: Board, keys: Keys, key: Key): void => {
  const { pen } = board;
  if (pitchClass(key.pitch) === C_CLASS && keys.row >= NAMED_ROW) {
    pen.context.fillStyle = nameColor(board, key.lit);
    pen.context.textAlign = "right";
    pen.context.fillText(noteName(key.pitch), pen.origin - PAD, key.top + keys.row / TWO + NUDGE);
    pen.context.textAlign = "left";
  }
};

const seam = ({ pen }: Board, keys: Keys, key: Key): void => {
  const pitch = pitchClass(key.pitch);
  if (pitch === C_CLASS || pitch === F_CLASS) {
    pen.context.fillStyle = pen.theme.line;
    pen.context.fillRect(LEFT, Math.round(key.top + keys.row), pen.origin, HAIRLINE);
  }
};

const piano = (board: Board, keys: Keys): void => {
  const { pen, sounding } = board;
  pen.context.fillStyle = pen.theme.keyWhite;
  pen.context.fillRect(LEFT, keys.top, pen.origin, keys.height);
  for (const pitch of Arr.range(keys.low, keys.high)) {
    const top = centerOf(keys)(pitch) - keys.row / TWO;
    const key = { pitch, top, lit: Arr.contains(sounding.keys, pitch) };
    body(board, keys, key);
    seam(board, keys, key);
    octave(board, keys, key);
  }
};

const laneColor = (board: Board, name: string, lit: boolean): string => {
  const { pen, layout } = board;
  if (lit) {
    return pen.theme.card;
  }
  if (layout.single) {
    return pen.theme.dim;
  }
  return pipe(
    layout.tracks,
    Arr.findFirst((track) => track.name === name),
    Option.match({ onNone: () => pen.theme.dim, onSome: trackColor(pen.theme.tint) }),
  );
};

const lane = (board: Board, name: string, index: number): void => {
  const { pen, layout, sounding } = board;
  const top = layout.rowsTop + index * layout.rowHeight;
  const lit = Arr.contains(sounding.rows, index);
  if (lit) {
    pen.context.fillStyle = pen.theme.hot;
    pen.context.fillRect(LEFT, top, pen.origin, layout.rowHeight);
  }
  if (layout.rowHeight >= NAMED_LANE) {
    const text = fitted(pen.context)(name, pen.origin - PAD * TWO);
    pen.context.fillStyle = laneColor(board, name, lit);
    pen.context.fillText(text, PAD, top + layout.rowHeight / TWO + NUDGE);
  }
};

const borders = ({ pen, layout }: Board): void => {
  pen.context.fillStyle = pen.theme.line;
  pen.context.fillRect(pen.origin - HAIRLINE, TOP, HAIRLINE, pen.height);
  pen.context.fillRect(LEFT, layout.top - HAIRLINE, pen.origin, HAIRLINE);
};

export const keyboard =
  (roll: Roll) =>
  (sounding: Sounding): void => {
    const board: Board = { ...roll, sounding };
    const { pen, layout } = roll;
    pen.context.fillStyle = pen.theme.card;
    pen.context.fillRect(LEFT, TOP, pen.origin, pen.height);
    pen.context.font = fontOf(pen)(FONT);
    if (Option.isSome(layout.keys)) {
      piano(board, layout.keys.value);
    }
    for (const [index, name] of layout.rows.entries()) {
      lane(board, name, index);
    }
    borders(board);
  };
