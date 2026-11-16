import { Predicate } from "effect";

const SILENT = 0;
const ONE = 1;
const STEREO = 2;

export interface Block {
  readonly channels: number;
  readonly scale: number;
  readonly data: ArrayLike<number>;
}

export interface Blocks {
  readonly frames: number;
  readonly block: (index: number) => readonly Block[];
}

export interface Ramps {
  readonly left: Float32Array;
  readonly right: Float32Array;
}

interface Span {
  readonly from: number;
  readonly to: number;
  readonly offset: number;
}

const otherOf = (stereo: boolean, left: number, right: number): number => {
  if (stereo) {
    return right;
  }
  return left;
};

const spanAdded =
  (block: Block, ramps: Ramps) =>
  (left: Float32Array, right: Float32Array, { from, to, offset }: Span): void => {
    const { data, scale, channels } = block;
    const stereo = channels === STEREO;
    let read = offset * channels;
    for (let frame = from; frame < to; frame += ONE) {
      const value = (data[read] ?? SILENT) * scale;
      const other = otherOf(stereo, value, (data[read + ONE] ?? SILENT) * scale);
      read += channels;
      left[frame] = (left[frame] ?? SILENT) + value * (ramps.left[frame] ?? SILENT);
      right[frame] = (right[frame] ?? SILENT) + other * (ramps.right[frame] ?? SILENT);
    }
  };

export interface Reading {
  readonly tape: Blocks;
  readonly track: number;
  readonly ramps: Ramps;
}

export const trackAdded =
  ({ tape, track, ramps }: Reading) =>
  (left: Float32Array, right: Float32Array, [position, end]: readonly [number, number]): void => {
    const size = tape.frames;
    for (let from = SILENT; from < end;) {
      const at = position + from;
      const index = Math.floor(at / size);
      const offset = at - index * size;
      const to = Math.min(end, from + size - offset);
      const block = tape.block(index)[track];
      if (Predicate.isNotUndefined(block) && block.channels !== SILENT) {
        spanAdded(block, ramps)(left, right, { from, to, offset });
      }
      from = to;
    }
  };
