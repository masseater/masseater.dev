import { Option, pipe } from "effect";
import type { Root, RootContent } from "mdast";
import type { LeafDirective } from "mdast-util-directive";
import type { MdxJsxFlowElement } from "mdast-util-mdx-jsx";
import type { Plugin } from "unified";

import { isLeafDirective, labelOf, mapTree } from "./remark-tree.ts";
import type { Transform } from "./remark-tree.ts";

const NAME = "youtube";

const COMPONENT = "YouTube";

const playerOf: Transform<LeafDirective, Option.Option<MdxJsxFlowElement>> = (node) =>
  pipe(
    Option.fromNullishOr(node.attributes),
    Option.flatMap((attributes) => Option.fromNullishOr(attributes["id"])),
    Option.map((id) => ({
      type: "mdxJsxFlowElement",
      name: COMPONENT,
      attributes: [
        { type: "mdxJsxAttribute", name: "id", value: id },
        { type: "mdxJsxAttribute", name: "title", value: labelOf(node) },
      ],
      children: [],
    })),
  );

const converted: Transform<RootContent, RootContent> = (node) =>
  pipe(
    Option.liftPredicate(node, isLeafDirective),
    Option.filter(({ name }) => name === NAME),
    Option.flatMap(playerOf),
    Option.getOrElse(() => node),
  );

const remarkYouTube: Plugin<[], Root> = () => mapTree(converted);

export { remarkYouTube };
