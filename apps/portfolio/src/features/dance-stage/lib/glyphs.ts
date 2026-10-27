import { Array as Arr, Option, pipe } from "effect";

import type { Fn } from "./fn";
import { TEXT_ROWS } from "./renderer";

const WIDTH = 2048;
const ROW_HEIGHT = 128;
const FONT = '700 96px "Noto Sans JP", "Hiragino Sans", sans-serif';
const HALF = 0.5;
const LEFT = 0;

type Glyphs = Readonly<{ canvas: HTMLCanvasElement; widths: readonly number[] }>;

const drawGlyphs: Fn<readonly string[], Option.Option<Glyphs>> = (texts) => {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = ROW_HEIGHT * TEXT_ROWS;
  return pipe(
    Option.fromNullishOr(canvas.getContext("2d")),
    Option.map((context) => {
      context.font = FONT;
      context.fillStyle = "white";
      context.textBaseline = "middle";
      const rows = Arr.take(texts, TEXT_ROWS);
      for (const [row, text] of rows.entries()) {
        context.fillText(text, LEFT, (row + HALF) * ROW_HEIGHT, WIDTH);
      }
      const widths = pipe(
        rows,
        Arr.map((text) => Math.min(context.measureText(text).width, WIDTH) / WIDTH),
      );
      return { canvas, widths };
    }),
  );
};

export type { Glyphs };
export { drawGlyphs };
