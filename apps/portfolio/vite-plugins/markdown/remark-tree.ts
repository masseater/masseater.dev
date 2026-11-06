import { Array as Arr, Option, Predicate, Record as Rec, pipe } from "effect";
import type { Parent, PhrasingContent, Root, RootContent, Text } from "mdast";
import type { LeafDirective } from "mdast-util-directive";
import type { MdxJsxFlowElement } from "mdast-util-mdx-jsx";

type Transform<Input, Output> = (input: Input) => Output;

const isParent: Predicate.Refinement<RootContent, Extract<RootContent, Parent>> = (node) =>
  Predicate.hasProperty(node, "children");

const withChildren = <Node extends Parent>(
  node: Node,
  transform: Transform<RootContent, RootContent>,
): Node => ({ ...node, children: pipe(node.children, Arr.map(transform)) });

const mapTree =
  (converted: Transform<RootContent, RootContent>): Transform<Root, Root> =>
  (tree) => {
    const transformNode: Transform<RootContent, RootContent> = (node) =>
      converted(
        pipe(
          Option.liftPredicate(node, isParent),
          Option.map((parent): RootContent => withChildren(parent, transformNode)),
          Option.getOrElse(() => node),
        ),
      );
    return withChildren(tree, transformNode);
  };

const isLeafDirective: Predicate.Refinement<RootContent, LeafDirective> = (node) =>
  node.type === "leafDirective";

const isText: Predicate.Refinement<PhrasingContent, Text> = (node) => node.type === "text";

const labelOf: Transform<LeafDirective, string> = (node) =>
  pipe(
    node.children,
    Arr.filter(isText),
    Arr.map(({ value }) => value),
    Arr.join(""),
  );

const componentOf = ({
  name,
  attributes,
}: Readonly<{
  name: string;
  attributes: Readonly<Record<string, string>>;
}>): MdxJsxFlowElement => ({
  type: "mdxJsxFlowElement",
  name,
  attributes: pipe(
    Rec.toEntries(attributes),
    Arr.map(([key, value]) => ({ type: "mdxJsxAttribute" as const, name: key, value })),
  ),
  children: [],
});

const leafDirectiveAs =
  ({
    directive,
    element,
  }: Readonly<{
    directive: string;
    element: Transform<LeafDirective, Option.Option<MdxJsxFlowElement>>;
  }>): Transform<RootContent, RootContent> =>
  (node) =>
    pipe(
      Option.liftPredicate(node, isLeafDirective),
      Option.filter(({ name }) => name === directive),
      Option.flatMap(element),
      Option.getOrElse(() => node),
    );

export type { Transform };
export { componentOf, labelOf, leafDirectiveAs, mapTree };
