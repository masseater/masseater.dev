import { Array as Arr, Option, pipe } from "effect";
import type { Predicate } from "effect";
import type { Element, Root, RootContent } from "hast";

type Transform<Input, Output> = (input: Input) => Output;

const HEADING = /^h[1-6]$/u;

const isElement: Predicate.Refinement<RootContent, Element> = (node) => node.type === "element";

const headingId: Transform<RootContent, Option.Option<string>> = (node) =>
  pipe(
    node,
    Option.liftPredicate(isElement),
    Option.filter(({ tagName }) => HEADING.test(tagName)),
    Option.flatMap(({ properties }) => Option.fromNullishOr(properties.id)),
    Option.map(String),
  );

const labelTable =
  (heading: Option.Option<string>): Transform<RootContent, RootContent> =>
  (node) =>
    pipe(
      node,
      Option.liftPredicate(isElement),
      Option.filter(({ tagName }) => tagName === "table"),
      Option.flatMap((table) =>
        pipe(
          heading,
          Option.map((id): RootContent => ({
            ...table,
            properties: { ...table.properties, ariaLabelledBy: [id] },
          })),
        ),
      ),
      Option.getOrElse(() => node),
    );

export const rehypeTableLabel = (): ((tree: Root) => Root) => (tree) => ({
  ...tree,
  children: pipe(
    tree.children,
    Arr.mapAccum(Option.none<string>(), (heading, node) => {
      const current = Option.orElse(headingId(node), () => heading);
      return [current, labelTable(current)(node)] as const;
    }),
    ([, children]) => children,
  ),
});
