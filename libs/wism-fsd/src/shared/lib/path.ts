import { Array as Arr, Option, String as Str, pipe } from "effect";

const SEPARATOR = "/";
const EXTENSION = ".";
const ROOT = "";

const NONE = 0;
const ONE = 1;

export const segments = (path: string): Arr.NonEmptyReadonlyArray<string> =>
  Str.split(path, SEPARATOR);

export const joinAll = (parts: readonly string[]): string => Arr.join(parts, SEPARATOR);

export const parent = (path: string): string => joinAll(Arr.dropRight(segments(path), ONE));

export const ancestors = (path: string): readonly string[] => {
  const parts = Arr.dropRight(segments(path), ONE);
  return pipe(
    Arr.range(NONE, parts.length),
    Arr.reverse,
    Arr.map((count) => joinAll(Arr.take(parts, count))),
  );
};

export const join =
  (dir: string) =>
  (name: string): string =>
    Arr.join(Arr.filter([dir, name], Str.isNonEmpty), SEPARATOR);

const below =
  (path: string) =>
  (prefix: string): Option.Option<string> =>
    pipe(
      Option.some(prefix),
      Option.filter((start) => Str.startsWith(start)(path)),
      Option.map((start) => Str.slice(start.length)(path)),
    );

export const inside =
  (dir: string) =>
  (path: string): Option.Option<string> =>
    pipe(
      Option.some(path),
      Option.filter(() => Str.isEmpty(dir)),
      Option.orElse(() => below(path)(`${dir}${SEPARATOR}`)),
    );

export const baseName = (path: string): string =>
  pipe(
    segments(path),
    Arr.last,
    Option.getOrElse(() => ROOT),
  );

export const stem = (name: string): string =>
  pipe(
    Str.split(name, EXTENSION),
    Arr.head,
    Option.getOrElse(() => name),
  );
