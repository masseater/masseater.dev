import { Option, pipe } from "effect";
import type { AstNode } from "langium";

import type { From } from "#/shared/lib/from.ts";

const FIRST = 1;
const UNKNOWN = 0;

export interface SourcePosition {
  readonly sourceLine: number;
  readonly sourceColumn: number;
}

export const sourceOf: From<AstNode, SourcePosition> = (node) =>
  pipe(
    Option.fromNullishOr(node.$cstNode),
    Option.match({
      onNone: () => ({ sourceLine: UNKNOWN, sourceColumn: UNKNOWN }),
      onSome: (cst) => ({
        sourceLine: cst.range.start.line + FIRST,
        sourceColumn: cst.range.start.character + FIRST,
      }),
    }),
  );
