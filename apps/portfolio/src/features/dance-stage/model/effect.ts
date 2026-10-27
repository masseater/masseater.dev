import { Array as Arr, Option, String as Str, pipe } from "effect";

type Pass = Readonly<{
  frag: string;
  target: Option.Option<string>;
  persistent: boolean;
}>;

type DanceEffect = Readonly<{
  note: string;
  passes: readonly Pass[];
}>;

const NOTE = "// note:";
const PASS = "// pass:";
const PERSISTENT = "persistent";

type Draft = Readonly<{ header: string; lines: readonly string[] }>;

const passOf = ({ header, lines }: Draft): Pass => {
  const words = pipe(header, Str.trim, Str.split(" "), Arr.filter(Str.isNonEmpty));
  return {
    frag: Arr.join(lines, "\n"),
    target: pipe(
      Arr.head(words),
      Option.filter((word) => word !== PERSISTENT),
    ),
    persistent: Arr.contains(words, PERSISTENT),
  };
};

const NEXT = 1;
const FIRST = 0;

const isPass = Str.startsWith(PASS);

type Header = Readonly<{ header: string; start: number }>;

const draftsOf = (lines: readonly string[]): readonly Draft[] => {
  const headers = pipe(
    lines,
    Arr.flatMap((line, index) =>
      pipe(
        Option.liftPredicate(line, isPass),
        Option.map((found): Header => ({
          header: Str.slice(PASS.length)(found),
          start: index + NEXT,
        })),
        Option.toArray,
      ),
    ),
  );
  return pipe(
    headers,
    Arr.match({
      onEmpty: (): readonly Header[] => [{ header: "", start: FIRST }],
      onNonEmpty: (found): readonly Header[] => found,
    }),
    Arr.map(({ header, start }) => ({
      header,
      lines: pipe(
        lines,
        Arr.drop(start),
        Arr.takeWhile((line) => !isPass(line)),
      ),
    })),
  );
};

const parseEffect = (source: string): DanceEffect => {
  const lines = Str.split(source, "\n");
  const note = pipe(
    lines,
    Arr.findFirst(Str.startsWith(NOTE)),
    Option.map((line) => pipe(line, Str.slice(NOTE.length), Str.trim)),
    Option.getOrElse(() => ""),
  );
  const body = pipe(
    lines,
    Arr.filter((line) => !Str.startsWith(NOTE)(line)),
  );
  return { note, passes: pipe(draftsOf(body), Arr.map(passOf)) };
};

export type { DanceEffect, Pass };
export { parseEffect };
