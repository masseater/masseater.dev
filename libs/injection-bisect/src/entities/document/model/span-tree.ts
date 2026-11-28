import { Array as Arr, Order, pipe } from "effect";

import type { Span } from "./parser.ts";

export interface SpanTree<Node> {
  readonly own: (text: string, node: Node) => readonly Span[];
  readonly children: (node: Node) => readonly Node[];
}

const byStart = Order.mapInput(Order.Number, ({ start }: Span) => start);

export const inSourceOrder = (spans: readonly Span[]): readonly Span[] => Arr.sort(spans, byStart);

export const spansOf = <Node>(
  tree: SpanTree<Node>,
): ((text: string, node: Node) => readonly Span[]) => {
  const spansIn = (text: string, node: Node): readonly Span[] => [
    ...tree.own(text, node),
    ...pipe(
      tree.children(node),
      Arr.flatMap((child) => spansIn(text, child)),
    ),
  ];
  return spansIn;
};
