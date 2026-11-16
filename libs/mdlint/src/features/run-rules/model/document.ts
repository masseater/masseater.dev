import { Array as Arr, Option, pipe } from "effect";

import type { MarkdownNode, Position } from "#/shared/config/index.ts";
import type { NativeNode, NativeTree } from "#/shared/native/index.ts";

const NEWLINE = 10;
const FIRST = 0;
const NEXT = 1;

export interface Document {
  readonly root: MarkdownNode;
  readonly textOf: (node: MarkdownNode) => string;
  readonly positionOf: (offset: number) => Position;
}

export interface DocumentInput {
  readonly text: string;
  readonly tree: NativeTree;
}

const nodeOf = (
  native: NativeNode,
  id: number,
  all: () => readonly MarkdownNode[],
): MarkdownNode => {
  const { type, ...data } = native.kind;
  const lookup = (index: number): Option.Option<MarkdownNode> => pipe(all(), Arr.get(index));
  return {
    type,
    id,
    start: native.start,
    end: native.end,
    data,
    get parent() {
      return pipe(
        Option.fromNullishOr(native.parent),
        Option.flatMap(lookup),
        Option.getOrUndefined,
      );
    },
    get children() {
      return pipe(
        native.children,
        Arr.flatMap((child) => Option.toArray(lookup(child))),
      );
    },
  };
};

export const documentOf = ({ text, tree }: DocumentInput): Option.Option<Document> => {
  const bytes = Buffer.from(text, "utf8");
  const starts = pipe(
    Arr.fromIterable(bytes.entries()),
    Arr.filter(([, byte]) => byte === NEWLINE),
    Arr.map(([index]) => index + NEXT),
    Arr.prepend(FIRST),
  );
  const decode = (start: number, end: number): string => bytes.toString("utf8", start, end);
  const nodes: readonly MarkdownNode[] = pipe(
    tree.nodes,
    Arr.map((native, id) => nodeOf(native, id, () => nodes)),
  );
  const positionOf = (offset: number): Position => {
    const line = pipe(
      starts,
      Arr.findLastIndex((start) => start <= offset),
      Option.getOrElse(() => FIRST),
    );
    const start = pipe(
      starts,
      Arr.get(line),
      Option.getOrElse(() => FIRST),
    );
    return { line: line + NEXT, column: decode(start, offset).length + NEXT };
  };
  return pipe(
    Arr.head(nodes),
    Option.map((root): Document => ({
      root,
      textOf: (node) => decode(node.start, node.end),
      positionOf,
    })),
  );
};
