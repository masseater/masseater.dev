import { Array as Arr, String as Str, pipe } from "effect";

const CONTINUATION = /\\\n/gu;
const QUOTED = /\$\{\{.*?\}\}|"(?:[^"\\]|\\.)*"|'[^']*'/gu;
const SEPARATOR = /&&|\|\||[;|\n`]|\$\(/u;
const BLANK = /\s+/u;
const ASSIGNMENT = /^[A-Za-z_][A-Za-z0-9_]*=/u;
const QUOTE = '""';

export type CommandWords = Arr.NonEmptyReadonlyArray<string>;

const wordsOf = (segment: string): readonly string[] =>
  pipe(
    Str.split(Str.trim(segment), BLANK),
    Arr.filter(Str.isNonEmpty),
    Arr.dropWhile((word) => ASSIGNMENT.test(word)),
  );

export const simpleCommands = (text: string): readonly CommandWords[] =>
  pipe(
    text,
    Str.replaceAll(CONTINUATION, " "),
    Str.replaceAll(QUOTED, QUOTE),
    Str.split(SEPARATOR),
    Arr.map(wordsOf),
    Arr.filter(Arr.isReadonlyArrayNonEmpty),
  );
