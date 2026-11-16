import { Array as Arr, String as Str, pipe } from "effect";

import type { SelectMatch, SelectedNode } from "#/entities/decision/index.ts";

import { dualSelect } from "./select.ts";
import type { DualSelect } from "./select.ts";

const commentsIn = (node: SelectedNode, { context }: SelectMatch): readonly string[] => {
  const [start, end] = node.range;
  return pipe(
    context.sourceCode.getAllComments(),
    Arr.filter((comment) => comment.start >= start && comment.end <= end),
    Arr.map((comment) => comment.value),
  );
};

export const hasCommentInside: DualSelect = dualSelect((node, match) =>
  Arr.isReadonlyArrayNonEmpty(commentsIn(node, match)),
);

const SUPPRESSIONS = [
  "eslint-disable",
  "oxlint-disable",
  "@ts-ignore",
  "@ts-expect-error",
  "@ts-nocheck",
  "fallow-ignore",
];

export const hasSuppression: DualSelect = dualSelect((node, match) =>
  pipe(
    commentsIn(node, match),
    Arr.some((comment) =>
      pipe(
        SUPPRESSIONS,
        Arr.some((word) => Str.includes(word)(comment)),
      ),
    ),
  ),
);
