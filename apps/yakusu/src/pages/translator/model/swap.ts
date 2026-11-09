import { Option, pipe } from "effect";

import { otherOf } from "#/entities/language";
import type { LanguageCode, Selection, Source } from "#/entities/language";
import type { Direction } from "#/features/translate-text";

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

const swapped = ({
  source,
  direction,
}: Readonly<{ source: Source; direction: Direction }>): Selection => ({
  source: { kind: "language", code: direction.target },
  target: swappedTarget({ source, direction }),
});

export { swapped };
