import { Array as Arr, Number as Num, Record as Rec, pipe } from "effect";

import type { Fn } from "./fn";
import type { Size } from "./gl";
import type { Frame } from "./renderer";
import { BANDS, POSE_FIELDS, POSE_POINTS, TEXT_ROWS } from "./renderer";

const SCALAR = 1;
const PAIR = 2;
const VECTOR = 4;
const POSE_SIZE = POSE_POINTS * POSE_FIELDS;

const LAYOUT = {
  pose: POSE_SIZE,
  lastPose: POSE_SIZE,
  bands: BANDS,
  textWidth: TEXT_ROWS,
  resolution: PAIR,
  time: SCALAR,
  frame: SCALAR,
  level: SCALAR,
  beat: SCALAR,
  beatCount: SCALAR,
} as const;

type Field = keyof typeof LAYOUT;

const offsetOf = (field: Field): number =>
  pipe(
    Rec.toEntries(LAYOUT),
    Arr.takeWhile(([name]) => name !== field),
    Arr.map(([, length]) => length),
    Num.sumAll,
  );

const OFFSETS = pipe(
  LAYOUT,
  Rec.map((_length, field) => offsetOf(field)),
);

const USED = Num.sumAll(Rec.values(LAYOUT));

const BLOCK_FLOATS = Math.ceil(USED / VECTOR) * VECTOR;

const BLOCK_BYTES = BLOCK_FLOATS * Float32Array.BYTES_PER_ELEMENT;

const emptyBlock = (): Float32Array => new Float32Array(BLOCK_FLOATS);

const fillBlock: Fn<
  Readonly<{ data: Float32Array; frame: Frame; lastPose: Float32Array; size: Size }>,
  Float32Array
> = ({ data, frame, lastPose, size }) => {
  data.set(frame.pose, OFFSETS.pose);
  data.set(lastPose, OFFSETS.lastPose);
  data.set(frame.bands, OFFSETS.bands);
  data.set(size, OFFSETS.resolution);
  data.set([frame.time, frame.frame, frame.level, frame.beat, frame.beatCount], OFFSETS.time);
  return data;
};

const fillTextWidths: Fn<Readonly<{ data: Float32Array; widths: readonly number[] }>, void> = ({
  data,
  widths,
}) => {
  data.set(pipe(widths, Arr.take(TEXT_ROWS)), OFFSETS.textWidth);
};

export { BLOCK_BYTES, emptyBlock, fillBlock, fillTextWidths, POSE_SIZE };
