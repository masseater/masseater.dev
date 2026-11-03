import { Option, pipe } from "effect";
import type { Root } from "mdast";
import type { LeafDirective } from "mdast-util-directive";
import type { MdxJsxFlowElement } from "mdast-util-mdx-jsx";
import type { Plugin } from "unified";

import { componentOf, labelOf, leafDirectiveAs, mapTree } from "./remark-tree.ts";
import type { Transform } from "./remark-tree.ts";

const playerOf: Transform<LeafDirective, Option.Option<MdxJsxFlowElement>> = (node) =>
  pipe(
    Option.fromNullishOr(node.attributes),
    Option.flatMap((attributes) => Option.fromNullishOr(attributes["id"])),
    Option.map((id) => componentOf({ name: "YouTube", attributes: { id, title: labelOf(node) } })),
  );

const remarkYouTube: Plugin<[], Root> = () =>
  mapTree(leafDirectiveAs({ directive: "youtube", element: playerOf }));

export { remarkYouTube };
