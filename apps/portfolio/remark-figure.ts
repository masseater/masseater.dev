import { Option, Schema, pipe } from "effect";
import type { Root, RootContent } from "mdast";
import type { LeafDirective } from "mdast-util-directive";
import type { MdxJsxFlowElement } from "mdast-util-mdx-jsx";
import type { Plugin } from "unified";

import { isLeafDirective, labelOf, mapTree } from "./remark-tree.ts";
import type { Transform } from "./remark-tree.ts";
import { FigureNameSchema } from "./src/entities/entry/model/figure.ts";

const NAME = "figure";

const COMPONENT = "Figure";

const decodeFigureName = Schema.decodeUnknownOption(FigureNameSchema);

const figureOf: Transform<LeafDirective, Option.Option<MdxJsxFlowElement>> = (node) =>
  pipe(
    Option.fromNullishOr(node.attributes),
    Option.flatMap((attributes) => decodeFigureName(attributes["name"])),
    Option.map((name) => ({
      type: "mdxJsxFlowElement",
      name: COMPONENT,
      attributes: [
        { type: "mdxJsxAttribute", name: "name", value: name },
        { type: "mdxJsxAttribute", name: "caption", value: labelOf(node) },
      ],
      children: [],
    })),
  );

const converted: Transform<RootContent, RootContent> = (node) =>
  pipe(
    Option.liftPredicate(node, isLeafDirective),
    Option.filter(({ name }) => name === NAME),
    Option.flatMap(figureOf),
    Option.getOrElse(() => node),
  );

const remarkFigure: Plugin<[], Root> = () => mapTree(converted);

export { remarkFigure };
