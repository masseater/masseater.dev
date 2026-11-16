import { Option, String as Str, pipe } from "effect";

import type { WikiImage } from "./technique.ts";

export const IMAGE_SEPARATOR = " ・ 画像: ";

export const imageCredit = ({ artist, title, license }: WikiImage): string =>
  `${pipe(
    Option.liftPredicate(artist, Str.isNonEmpty),
    Option.getOrElse(() => title),
  )}（${license}）`;
