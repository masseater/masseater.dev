import { Array as Arr, Option, pipe } from "effect";
import { CstUtils, isLeafCstNode } from "langium";
import type { AstNode, CstNode, LeafCstNode } from "langium";

import type { From } from "./problem.ts";

const KINDS = ["SL_COMMENT", "ML_COMMENT"];
const FIRST = 1;

export interface SourceComment {
  readonly line: number;
  readonly column: number;
  readonly text: string;
}

const leavesOf: From<CstNode, readonly LeafCstNode[]> = (cst) =>
  CstUtils.streamCst(cst)
    .filter((node) => isLeafCstNode(node))
    .toArray();

const isComment: From<LeafCstNode, boolean> = (leaf) =>
  leaf.hidden && Arr.contains(KINDS, leaf.tokenType.name);

export const commentsOf: From<AstNode, readonly SourceComment[]> = (root) =>
  pipe(
    Option.fromNullishOr(root.$cstNode),
    Option.map(leavesOf),
    Option.getOrElse((): readonly LeafCstNode[] => []),
    Arr.filter(isComment),
    Arr.map((leaf) => ({
      line: leaf.range.start.line + FIRST,
      column: leaf.range.start.character + FIRST,
      text: leaf.text,
    })),
  );
