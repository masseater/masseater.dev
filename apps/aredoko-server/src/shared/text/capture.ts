import { Array, Option, Record, String, pipe } from "effect";

const groupOf =
  (name: string) =>
  ({ groups }: RegExpMatchArray): Option.Option<string> =>
    pipe(Option.fromNullishOr(groups), Option.flatMap(Record.get(name)));

const capture =
  ({
    pattern,
    name,
  }: {
    readonly pattern: RegExp;
    readonly name: string;
  }): ((text: string) => Option.Option<string>) =>
  (text) =>
    pipe(text, String.match(pattern), Option.flatMap(groupOf(name)));

const captureAll =
  ({
    pattern,
    name,
  }: {
    readonly pattern: RegExp;
    readonly name: string;
  }): ((text: string) => readonly string[]) =>
  (text) =>
    pipe(
      text,
      String.matchAll(pattern),
      Array.fromIterable,
      Array.map(groupOf(name)),
      Array.getSomes,
    );

export { capture, captureAll };
