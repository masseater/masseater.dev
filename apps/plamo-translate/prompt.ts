import type { TranslateRequestValue } from "@masseater.dev/plamo-translate-protocol";
import { Array as Arr, Option, pipe } from "effect";

export type Direction = Omit<TranslateRequestValue, "text">;

export type Pair = Readonly<{ source: string; translation: string }>;

const TAG = "<|plamo:tag|>";
const KEY = "<|plamo:key|>";
const VAL = "<|plamo:val|>";
const MSG = "<|plamo:msg|>";

export const STOP: readonly string[] = [TAG, "<|plamo:bos|>"];

const field = (key: string, value: string | undefined): string =>
  pipe(
    Option.fromUndefinedOr(value),
    Option.match({ onNone: () => "", onSome: (present) => `${KEY}${key}${VAL}${present}` }),
  );

const input = (direction: Direction, text: string): string =>
  `${TAG}input${field("lang", direction.from)}${MSG}${text}`;

const output = (direction: Direction): string => `${TAG}output${field("lang", direction.to)}`;

const turn =
  (direction: Direction) =>
  (pair: Pair): string =>
    `${input(direction, pair.source)}${output(direction)}${MSG}${pair.translation}`;

export type Asking = Readonly<{
  direction: Direction;
  previous: Option.Option<Pair>;
  text: string;
}>;

export const promptOf = ({ direction, previous, text }: Asking): string =>
  Arr.join(
    [
      `${TAG}dataset${MSG}translation`,
      ...Arr.map(Option.toArray(previous), turn(direction)),
      input(direction, text),
      output(direction),
      field("form", direction.form),
      MSG,
    ],
    "",
  );
