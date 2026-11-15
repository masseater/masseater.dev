import { Option, pipe } from "effect";

import type { Direction, LanguageCode, Selection, Source } from "#/entities/language";
import { otherOf } from "#/entities/language";

const swappedTarget = ({
  source,
  direction,
}: Readonly<{ source: Source; direction: Direction }>): LanguageCode => {
  if (source.kind === "language") {
    return source.code;
  }
  return pipe(
    direction.detected,
    Option.getOrElse(() => otherOf(direction.target)),
  );
};

export const swapped = ({
  source,
  direction,
}: Readonly<{ source: Source; direction: Direction }>): Selection => ({
  source: { kind: "language", code: direction.target },
  target: swappedTarget({ source, direction }),
});
