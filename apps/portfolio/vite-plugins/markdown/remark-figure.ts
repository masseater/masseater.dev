import { Option, Schema, pipe } from "effect";
import type { Root } from "mdast";
import type { LeafDirective } from "mdast-util-directive";
import type { MdxJsxFlowElement } from "mdast-util-mdx-jsx";
import type { Plugin } from "unified";

import { FigureNameSchema } from "#/entities/entry/model/figure.ts";

import { componentOf, labelOf, leafDirectiveAs, mapTree } from "./remark-tree.ts";
import type { Transform } from "./remark-tree.ts";

const decodeFigureName = Schema.decodeUnknownOption(FigureNameSchema);

const figureOf: Transform<LeafDirective, Option.Option<MdxJsxFlowElement>> = (node) =>
  pipe(
    Option.fromNullishOr(node.attributes),
    Option.flatMap((attributes) => decodeFigureName(attributes["name"])),
    Option.map((name) =>
      componentOf({ name: "Figure", attributes: { name, caption: labelOf(node) } }),
    ),
  );

const remarkFigure: Plugin<[], Root> = () =>
  mapTree(leafDirectiveAs({ directive: "figure", element: figureOf }));

export { remarkFigure };
