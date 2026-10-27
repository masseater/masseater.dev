import { Array as Arr, Option, String as Str, pipe } from "effect";

type Pass = Readonly<{
  frag: string;
  target: Option.Option<string>;
  persistent: boolean;
}>;

type TextRow = Readonly<{ text: string; cells: boolean }>;

type DanceEffect = Readonly<{
  note: string;
  texts: readonly TextRow[];
  passes: readonly Pass[];
}>;

const NOTE = "// note:";
const PASS = "// pass:";
const TEXT = "// text:";
const GLYPHS = "// glyphs:";
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

const headerValue =
  (prefix: string) =>
  (line: string): string =>
    pipe(line, Str.slice(prefix.length), Str.trim);

const isText = (line: string): boolean =>
  Str.startsWith(TEXT)(line) || Str.startsWith(GLYPHS)(line);

const textRowOf = (line: string): TextRow => {
  if (Str.startsWith(GLYPHS)(line)) {
    return { text: headerValue(GLYPHS)(line), cells: true };
  }
  return { text: headerValue(TEXT)(line), cells: false };
};

const parseEffect = (source: string): DanceEffect => {
  const lines = Str.split(source, "\n");
  const note = pipe(
    lines,
    Arr.findFirst(Str.startsWith(NOTE)),
    Option.map(headerValue(NOTE)),
    Option.getOrElse(() => ""),
  );
  const texts = pipe(lines, Arr.filter(isText), Arr.map(textRowOf));
  const body = pipe(
    lines,
    Arr.filter((line) => !Str.startsWith(NOTE)(line) && !isText(line)),
  );
  return { note, texts, passes: pipe(draftsOf(body), Arr.map(passOf)) };
};

export type { DanceEffect, Pass, TextRow };
export { parseEffect };
