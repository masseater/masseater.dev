import { Array as Arr, Option, Predicate, Schema, pipe } from "effect";
import type { Parent, PhrasingContent, Root, RootContent, Text } from "mdast";
import type { ContainerDirective, LeafDirective, TextDirective } from "mdast-util-directive";
import type { MdxJsxFlowElement } from "mdast-util-mdx-jsx";
import type { Plugin } from "unified";

import { SpeakerSchema } from "./src/entities/entry/model/speaker.ts";

type Transform<Input, Output> = (input: Input) => Output;

const COMPONENT = "Speech";

const decodeSpeaker = Schema.decodeUnknownOption(SpeakerSchema);

const isContainer: Predicate.Refinement<RootContent, ContainerDirective> = (node) =>
  node.type === "containerDirective";

const isInline: Predicate.Refinement<RootContent, LeafDirective | TextDirective> = (node) =>
  node.type === "leafDirective" || node.type === "textDirective";

const isText: Predicate.Refinement<PhrasingContent, Text> = (node) => node.type === "text";

const isParent: Predicate.Refinement<RootContent, Extract<RootContent, Parent>> = (node) =>
  Predicate.hasProperty(node, "children");

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

const withChildren = <Node extends Parent>(
  node: Node,
  transform: Transform<RootContent, RootContent>,
): Node => ({ ...node, children: pipe(node.children, Arr.map(transform)) });

const transformNode: Transform<RootContent, RootContent> = (node) =>
  converted(
    pipe(
      Option.liftPredicate(node, isParent),
      Option.map((parent): RootContent => withChildren(parent, transformNode)),
      Option.getOrElse(() => node),
    ),
  );

const remarkDialogue: Plugin<[], Root> = () => (tree: Root) => withChildren(tree, transformNode);

export { remarkDialogue };
