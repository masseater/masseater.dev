import type { Predicate } from "effect";
import { Array as Arr, Option, Schema, pipe } from "effect";
import type { PhrasingContent, Root, RootContent, Text } from "mdast";
import type { ContainerDirective, LeafDirective, TextDirective } from "mdast-util-directive";
import type { MdxJsxFlowElement } from "mdast-util-mdx-jsx";
import type { Plugin } from "unified";

import { mapTree } from "./remark-tree.ts";
import type { Transform } from "./remark-tree.ts";
import { SpeakerSchema } from "./src/entities/entry/model/speaker.ts";

const COMPONENT = "Speech";

const decodeSpeaker = Schema.decodeUnknownOption(SpeakerSchema);

const isContainer: Predicate.Refinement<RootContent, ContainerDirective> = (node) =>
  node.type === "containerDirective";

const isInline: Predicate.Refinement<RootContent, LeafDirective | TextDirective> = (node) =>
  node.type === "leafDirective" || node.type === "textDirective";

const isText: Predicate.Refinement<PhrasingContent, Text> = (node) => node.type === "text";

const restored: Transform<LeafDirective | TextDirective, Text> = (node) => ({
  type: "text",
  value: pipe(
    node.children,
    Arr.filter(isText),
    Arr.map(({ value }) => value),
    Arr.join(""),
    (label) => `:${node.name}${label}`,
  ),
});

const speechOf: Transform<ContainerDirective, Option.Option<MdxJsxFlowElement>> = (node) =>
  pipe(
    decodeSpeaker(node.name),
    Option.map((speaker) => ({
      type: "mdxJsxFlowElement",
      name: COMPONENT,
      attributes: [{ type: "mdxJsxAttribute", name: "speaker", value: speaker }],
      children: node.children,
    })),
  );

const converted: Transform<RootContent, RootContent> = (node) =>
  pipe(
    Option.liftPredicate(node, isContainer),
    Option.flatMap(speechOf),
    Option.orElse(() => pipe(Option.liftPredicate(node, isInline), Option.map(restored))),
    Option.getOrElse(() => node),
  );

const remarkDialogue: Plugin<[], Root> = () => mapTree(converted);

export { remarkDialogue };
