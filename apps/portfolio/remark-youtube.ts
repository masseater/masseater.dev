import type { Predicate } from "effect";
import { Array as Arr, Option, pipe } from "effect";
import type { PhrasingContent, Root, RootContent, Text } from "mdast";
import type { LeafDirective } from "mdast-util-directive";
import type { MdxJsxFlowElement } from "mdast-util-mdx-jsx";
import type { Plugin } from "unified";

import { mapTree } from "./remark-tree.ts";
import type { Transform } from "./remark-tree.ts";

const NAME = "youtube";

const COMPONENT = "YouTube";

const isLeaf: Predicate.Refinement<RootContent, LeafDirective> = (node) =>
  node.type === "leafDirective";

const isText: Predicate.Refinement<PhrasingContent, Text> = (node) => node.type === "text";

const titleOf: Transform<LeafDirective, string> = (node) =>
  pipe(
    node.children,
    Arr.filter(isText),
    Arr.map(({ value }) => value),
    Arr.join(""),
  );

const playerOf: Transform<LeafDirective, Option.Option<MdxJsxFlowElement>> = (node) =>
  pipe(
    Option.fromNullishOr(node.attributes),
    Option.flatMap((attributes) => Option.fromNullishOr(attributes["id"])),
    Option.map((id) => ({
      type: "mdxJsxFlowElement",
      name: COMPONENT,
      attributes: [
        { type: "mdxJsxAttribute", name: "id", value: id },
        { type: "mdxJsxAttribute", name: "title", value: titleOf(node) },
      ],
      children: [],
    })),
  );

const converted: Transform<RootContent, RootContent> = (node) =>
  pipe(
    Option.liftPredicate(node, isLeaf),
    Option.filter(({ name }) => name === NAME),
    Option.flatMap(playerOf),
    Option.getOrElse(() => node),
  );

const remarkYouTube: Plugin<[], Root> = () => mapTree(converted);

export { remarkYouTube };
