import { Option } from "effect";

import { otherOf } from "./languages.ts";
import type { LanguageCode } from "./languages.ts";
import type { Source } from "./selection.ts";

type Direction = Readonly<{
  source: Option.Option<LanguageCode>;
  target: LanguageCode;
  detected: Option.Option<LanguageCode>;
}>;

const KANA = /[\p{Script=Hiragana}\p{Script=Katakana}]/u;

const detectedIn = (text: string): Option.Option<LanguageCode> => {
  if (KANA.test(text)) {
    return Option.some("ja");
  }
  return Option.none();
};

const resolveDirection = ({
  text,
  source,
  target,
}: Readonly<{ text: string; source: Source; target: LanguageCode }>): Direction => {
  if (source.kind === "language") {
    return { source: Option.some(source.code), target, detected: Option.none() };
  }
  const detected = detectedIn(text);
  if (Option.contains(detected, target)) {
    return { source: Option.none(), target: otherOf(target), detected };
  }
  return { source: Option.none(), target, detected };
};

export { resolveDirection };
export type { Direction };
