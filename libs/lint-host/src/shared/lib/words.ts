import { Option } from "effect";

const WORD = 4;
const EMPTY = 0;

export const aligned = (buffer: Uint8Array): Uint8Array =>
  Option.match(
    Option.liftPredicate(buffer, ({ byteOffset }) => byteOffset % WORD === EMPTY),
    {
      onNone: () => Uint8Array.from(buffer),
      onSome: (value) => value,
    },
  );

export const wordAt =
  (words: Uint32Array) =>
  (index: number): number =>
    words[index] ?? EMPTY;
