import { Array as Arr, Option, pipe, String as Str } from "effect";

const segmenter = new Intl.Segmenter("ja", { granularity: "word" });
const ZERO_WIDTH_SPACE = 8203;
const BREAK_OPPORTUNITY = String.fromCodePoint(ZERO_WIDTH_SPACE);
const TRAILING = /^[\p{Script=Hiragana}\p{P}ー]/u;
const HIRAGANA_WORD = /^\p{Script=Hiragana}{2,}$/u;
const AFTER_PARTICLE = /[をにはがのかもへ、。！？」』）]$/u;
const AUXILIARY = /^(?:で[すしさ]|だ[っろ]|ま[すせし])/u;
const OPENING = /^[「『（(]/u;
const OPENED = /[「『（(]$/u;
const PREVIOUS = 1;

const wordAfterParticle = (segment: string, previous: string): boolean =>
  HIRAGANA_WORD.test(segment) && AFTER_PARTICLE.test(previous) && !AUXILIARY.test(segment);

const startsPhrase = (segment: string, previous: string): boolean => {
  if (OPENED.test(previous)) {
    return false;
  }
  if (OPENING.test(segment) || !TRAILING.test(segment)) {
    return true;
  }
  return wordAfterParticle(segment, previous);
};

const withBreak =
  (segments: readonly string[]) =>
  (segment: string, index: number): string => {
    const previous = Option.getOrElse(Arr.get(segments, index - PREVIOUS), () => "");
    if (startsPhrase(segment, previous)) {
      return `${BREAK_OPPORTUNITY}${segment}`;
    }
    return segment;
  };

const phrased = (text: string): string => {
  const segments = pipe(
    Arr.fromIterable(segmenter.segment(text)),
    Arr.map((part) => part.segment),
  );
  return pipe(
    segments,
    Arr.map(withBreak(segments)),
    Arr.join(""),
    Str.replace(new RegExp(`^${BREAK_OPPORTUNITY}`, "u"), ""),
  );
};

export { phrased };
