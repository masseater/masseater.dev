import { Array as Arr, Option, pipe } from "effect";

import type { TextRow } from "#/features/dance-stage/model/effect";

import type { Fn } from "./fn";
import { TEXT_ROWS } from "./renderer";

const WIDTH = 2048;
const ROW_HEIGHT = 128;
const FONT = '700 96px "Noto Sans JP", "Hiragino Sans", sans-serif';
const HALF = 0.5;
const LEFT = 0;
const CELL = ROW_HEIGHT;

type Glyphs = Readonly<{ canvas: HTMLCanvasElement; widths: readonly number[] }>;

type RowInput = Readonly<{ context: CanvasRenderingContext2D; row: TextRow; middle: number }>;

const drawRow: Fn<RowInput, number> = ({ context, row, middle }) => {
  if (!row.cells) {
    context.textAlign = "left";
    context.fillText(row.text, LEFT, middle, WIDTH);
    return Math.min(context.measureText(row.text).width, WIDTH) / WIDTH;
  }
  const characters = Arr.fromIterable(row.text);
  context.textAlign = "center";
  for (const [index, character] of characters.entries()) {
    context.fillText(character, (index + HALF) * CELL, middle, CELL);
  }
  return Math.min(characters.length * CELL, WIDTH) / WIDTH;
};

const drawGlyphs: Fn<readonly TextRow[], Option.Option<Glyphs>> = (texts) => {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = ROW_HEIGHT * TEXT_ROWS;
  return pipe(
    Option.fromNullishOr(canvas.getContext("2d")),
    Option.map((context) => {
      context.font = FONT;
      context.fillStyle = "white";
      context.textBaseline = "middle";
      const widths = pipe(
        Arr.take(texts, TEXT_ROWS),
        Arr.map((row, index) => drawRow({ context, row, middle: (index + HALF) * ROW_HEIGHT })),
      );
      return { canvas, widths };
    }),
  );
};

export type { Glyphs };
export { drawGlyphs };
