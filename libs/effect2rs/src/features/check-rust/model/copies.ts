import { Array as Arr, Option, String, pipe } from "effect";

export interface RustFile {
  readonly path: string;
  readonly source: string;
}

export interface Copy {
  readonly path: string;
  readonly line: number;
  readonly name: string;
}

interface Declared {
  readonly name: string;
  readonly index: number;
}

const DECLARATION =
  /^[ \t]*(?:pub(?:\([^)]*\))?[ \t]+)?(?:struct|enum|type|const(?![ \t]+(?:fn|unsafe|async|extern)\b)|static)[ \t]+(?<name>[A-Za-z_]\w*)/gmu;

const START = 0;

const declaredIn = (source: string): readonly Declared[] =>
  pipe(
    Arr.fromIterable(String.matchAll(DECLARATION)(source)),
    Arr.flatMap((found) =>
      pipe(
        Option.fromNullishOr(found.groups),
        Option.flatMap(({ name }) => Option.fromNullishOr(name)),
        Option.map((name) => ({ name, index: found.index ?? START })),
        Option.toArray,
      ),
    ),
  );

const lineAt =
  (source: string) =>
  (index: number): number =>
    pipe(source, String.slice(START, index), String.split("\n"), Arr.length);

const copiesIn =
  (generated: readonly string[]) =>
  ({ path, source }: RustFile): readonly Copy[] =>
    pipe(
      declaredIn(source),
      Arr.filter(({ name }) => pipe(generated, Arr.contains(name))),
      Arr.map(({ name, index }) => ({ path, line: lineAt(source)(index), name })),
    );

export const copiesOf =
  (generated: string) =>
  (files: readonly RustFile[]): readonly Copy[] => {
    const names = pipe(
      declaredIn(generated),
      Arr.map(({ name }) => name),
    );
    return pipe(files, Arr.flatMap(copiesIn(names)));
  };
