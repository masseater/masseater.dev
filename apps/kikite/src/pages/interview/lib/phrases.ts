import { Array as Arr, pipe, String as Str } from "effect";

const segmenter = new Intl.Segmenter("ja", { granularity: "word" });
const ZERO_WIDTH_SPACE = 8203;
const BREAK_OPPORTUNITY = String.fromCodePoint(ZERO_WIDTH_SPACE);
const TRAILING = /^[\p{Script=Hiragana}\p{P}ー]/u;

const withBreak = (segment: string): string => {
  if (TRAILING.test(segment)) {
    return segment;
  }
  return `${BREAK_OPPORTUNITY}${segment}`;
};

const phrased = (text: string): string =>
  pipe(
    Arr.fromIterable(segmenter.segment(text)),
    Arr.map((part) => withBreak(part.segment)),
    Arr.join(""),
    Str.replace(new RegExp(`^${BREAK_OPPORTUNITY}`, "u"), ""),
  );

export { phrased };
