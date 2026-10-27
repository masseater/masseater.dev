import { Option, String as Str, pipe } from "effect";

import type { WikiImage } from "./technique";

const IMAGE_SEPARATOR = " ・ 画像: ";

const imageCredit = ({ artist, title, license }: WikiImage): string =>
  `${pipe(
    Option.liftPredicate(artist, Str.isNonEmpty),
    Option.getOrElse(() => title),
  )}（${license}）`;

export { IMAGE_SEPARATOR, imageCredit };
