import { Array as Arr, String as Str, pipe } from "effect";

type Part = Readonly<{ text: string; translate: boolean }>;

type Chunk = Readonly<{ gap: string; text: string }>;

type Chunks = Arr.NonEmptyReadonlyArray<Chunk>;

const BLANK_LINES = /(?<gap>[^\S\n]*\n[^\S\n]*\n\s*)/u;

const FROM_FIRST_TEXT = /\S[\s\S]*$/u;

const UP_TO_LAST_TEXT = /^[\s\S]*\S/u;

const GAP_AND_PARAGRAPH = 2;

const lengthOf = (text: string): number => Arr.fromIterable(text).length;

const gapsAndParagraphs = (
  pieces: Arr.NonEmptyReadonlyArray<string>,
): readonly (readonly string[])[] => Arr.chunksOf(Arr.tailNonEmpty(pieces), GAP_AND_PARAGRAPH);

const merge =
  (limit: number) =>
  (chunks: Chunks, [gap = "", paragraph = ""]: readonly string[]): Chunks => {
    const last = Arr.lastNonEmpty(chunks);
    const joined = `${last.text}${gap}${paragraph}`;
    if (lengthOf(joined) <= limit) {
      return Arr.append(Arr.initNonEmpty(chunks), { gap: last.gap, text: joined });
    }
    return Arr.append(chunks, { gap, text: paragraph });
  };

const space = (text: string): readonly Part[] => {
  if (Str.isEmpty(text)) {
    return [];
  }
  return [{ text, translate: false }];
};

const partsOf = ({ gap, text }: Chunk): readonly Part[] => [
  ...space(gap),
  { text, translate: true },
];

const split =
  (limit: number) =>
  (text: string): readonly Part[] => {
    const body = Str.trim(text);
    if (Str.isEmpty(body)) {
      return space(text);
    }
    const pieces = Str.split(BLANK_LINES)(body);
    const first: Chunk = {
      gap: Str.replace(FROM_FIRST_TEXT, "")(text),
      text: Arr.headNonEmpty(pieces),
    };
    const chunks = Arr.reduce(gapsAndParagraphs(pieces), Arr.of(first), merge(limit));
    return [
      ...pipe(chunks, Arr.flatMap(partsOf)),
      ...space(Str.replace(UP_TO_LAST_TEXT, "")(text)),
    ];
  };

export { split };
export type { Part };
