import { Array as Arr, Option, Schema, String as Str, pipe } from "effect";

export interface Location {
  readonly path: string;
  readonly line: number | string;
  readonly rule: string;
}

const NO_FINDINGS: readonly string[] = [];

const decodeJson = Schema.decodeOption(Schema.fromJsonString(Schema.Unknown));

export const linesOf = (text: string): readonly string[] =>
  pipe(Str.split(text, "\n"), Arr.map(Str.trimEnd), Arr.filter(Str.isNonEmpty));

export const keyOf = ({ path, line, rule }: Location): string =>
  `${Str.replace(/^\.\//u, "")(path)}:${line}:${rule}`;

const groupOf =
  (groups: Readonly<Record<string, string | undefined>>) =>
  (name: string): string =>
    Option.getOrElse(Option.fromNullishOr(groups[name]), () => "");

const keyOfMatch = (found: RegExpExecArray): Option.Option<string> =>
  pipe(
    Option.fromNullishOr(found.groups),
    Option.map(groupOf),
    Option.map((group) => keyOf({ path: group("path"), line: group("line"), rule: group("rule") })),
  );

export const matching =
  (pattern: RegExp) =>
  (text: string): readonly string[] =>
    pipe(
      linesOf(text),
      Arr.map((line) => Option.flatMap(Option.fromNullishOr(pattern.exec(line)), keyOfMatch)),
      Arr.getSomes,
    );

export const containing =
  (needle: string) =>
  (text: string): readonly string[] =>
    pipe(linesOf(text), Arr.filter(Str.includes(needle)));

export const jsonOf = (text: string): Option.Option<unknown> => decodeJson(Str.trim(text));

export const orNone = (found: Option.Option<readonly string[]>): readonly string[] =>
  Option.getOrElse(found, () => NO_FINDINGS);

export const indexKeys = (items: readonly unknown[]): readonly string[] =>
  pipe(
    items,
    Arr.map((_item, index) => String(index)),
  );

export const fromJson =
  <Item>(decode: (input: unknown) => Option.Option<Item>) =>
  (keys: (item: Item) => readonly string[]) =>
  (text: string): readonly string[] =>
    orNone(pipe(jsonOf(text), Option.flatMap(decode), Option.map(keys)));
