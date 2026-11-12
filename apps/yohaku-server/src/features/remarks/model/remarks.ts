import { Remark } from "@masseater.dev/yohaku-protocol";
import type { Paragraph } from "@masseater.dev/yohaku-protocol";
import { Array, Option, String, pipe } from "effect";

import { NOVEL_RULES } from "./novel-rules.ts";
import type { NovelRule } from "./novel-rules.ts";

type Found = typeof Remark.Type;

const lengthOf = (found: RegExpMatchArray): number =>
  pipe(
    Array.head(found),
    Option.map(String.length),
    Option.getOrElse(() => String.length(String.empty)),
  );

const remarksBy =
  (paragraph: typeof Paragraph.Type) =>
  ({ rule, message, pattern }: NovelRule): readonly Found[] =>
    pipe(
      paragraph.text,
      String.matchAll(pattern),
      Array.fromIterable,
      Array.map((found) =>
        pipe(
          Option.fromUndefinedOr(found.index),
          Option.map((from) =>
            Remark.make({
              paragraphId: paragraph.id,
              from,
              to: from + lengthOf(found),
              rule,
              message,
            }),
          ),
        ),
      ),
      Array.getSomes,
    );

const remarksIn = (paragraph: typeof Paragraph.Type): readonly Found[] =>
  pipe(NOVEL_RULES, Array.flatMap(remarksBy(paragraph)));

const remarksOf = (
  paragraphs: readonly (typeof Paragraph.Type)[],
): readonly (typeof Remark.Type)[] => pipe(paragraphs, Array.flatMap(remarksIn));

export { remarksOf };
