import { Option, pipe } from "effect";

import type { Direction } from "./direction.ts";
import { otherOf } from "./languages.ts";
import type { LanguageCode } from "./languages.ts";
import type { Selection, Source } from "./selection.ts";

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
