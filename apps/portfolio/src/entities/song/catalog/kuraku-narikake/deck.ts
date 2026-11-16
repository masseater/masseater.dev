import type { Tape } from "@masseater.dev/daw-view";
import { Array as Arr, Option, pipe } from "effect";

import type { Block, Blocks, Slot } from "./program/song.js";

const SUMMED_FRAMES = 32_768;
const STEREO = 2;
const FIRST = 0;
const NEXT = 1;
const SILENCE = 0;
const UNSCALED = 1;
const SLOT = { drums: 0, music: 1 } as const;
const SUMMED: readonly Slot[] = [
  { name: "DRUMS", drum: true },
  { name: "MUSIC", drum: false },
];

export type Deck = Blocks &
  Readonly<{
    write: (
      slot: number,
      left: Float32Array<ArrayBuffer>,
      right: Float32Array<ArrayBuffer>,
    ) => void;
  }>;

export type Held = Readonly<{
  deck: Deck;
  tape: Option.Option<Tape>;
  slotOf: (index: number, drum: boolean) => number;
  stemsOf: (tracks: readonly string[], drums: readonly string[]) => readonly Slot[];
}>;

type Sum = Readonly<{ left: Float32Array<ArrayBuffer>; right: Float32Array<ArrayBuffer> }>;

const added = (
  sum: Sum,
  left: Float32Array<ArrayBuffer>,
  right: Float32Array<ArrayBuffer>,
): void => {
  for (let index = FIRST; index < sum.left.length; index += NEXT) {
    sum.left[index] = (sum.left[index] ?? SILENCE) + (left[index] ?? SILENCE);
    sum.right[index] = (sum.right[index] ?? SILENCE) + (right[index] ?? SILENCE);
  }
};

const interleaved = (sum: Sum, block: number): Block => {
  const from = block * SUMMED_FRAMES;
  const to = Math.min(sum.left.length, from + SUMMED_FRAMES);
  const data = new Float32Array((to - from) * STEREO);
  for (let index = from; index < to; index += NEXT) {
    const at = (index - from) * STEREO;
    data[at] = sum.left[index] ?? SILENCE;
    data[at + NEXT] = sum.right[index] ?? SILENCE;
  }
  return { channels: STEREO, scale: UNSCALED, data };
};

const summedDeck = (frames: number): Deck => {
  const sums: readonly Sum[] = pipe(
    SUMMED,
    Arr.map(() => ({ left: new Float32Array(frames), right: new Float32Array(frames) })),
  );
  return {
    frames: SUMMED_FRAMES,
    write: (slot, left, right) => {
      const sum = Arr.get(sums, slot);
      if (Option.isSome(sum)) {
        added(sum.value, left, right);
      }
    },
    block: (index) =>
      Promise.resolve(
        pipe(
          sums,
          Arr.map((sum) => interleaved(sum, index)),
        ),
      ),
  };
};

const taped = (tape: Tape): Held => ({
  deck: { frames: tape.frames, write: tape.write, block: tape.block },
  tape: Option.some(tape),
  slotOf: (index) => index,
  stemsOf: (tracks, drums) =>
    pipe(
      tracks,
      Arr.map((name) => ({ name, drum: drums.includes(name) })),
    ),
});

const summed = (frames: number): Held => ({
  deck: summedDeck(frames),
  tape: Option.none(),
  slotOf: (_index, drum) => {
    if (drum) {
      return SLOT.drums;
    }
    return SLOT.music;
  },
  stemsOf: () => SUMMED,
});

export const heldOn =
  (frames: number) =>
  (tape: Option.Option<Tape>): Held =>
    Option.match(tape, { onNone: () => summed(frames), onSome: taped });
