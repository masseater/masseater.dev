import { Array as Arr, Option, String as Str } from "effect";

const START = 0;
const AFTER_NEWLINE = 1;

export const characterColumnOf =
  (text: string) =>
  (offset: number): number => {
    const before = Str.slice(START, offset)(text);
    const lineStart = Option.match(Str.lastIndexOf("\n")(before), {
      onNone: () => START,
      onSome: (index) => index + AFTER_NEWLINE,
    });
    return Arr.fromIterable(Str.slice(lineStart)(before)).length;
  };
