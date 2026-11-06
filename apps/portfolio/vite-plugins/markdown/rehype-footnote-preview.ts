import { Array as Arr, Option, Predicate, String as Str, pipe } from "effect";
import type { Element, ElementContent, Root, RootContent, Text } from "hast";
import type {
  MdxJsxAttribute,
  MdxJsxFlowElementHast,
  MdxJsxTextElementHast,
} from "mdast-util-mdx-jsx";

type Transform<Input, Output> = (input: Input) => Output;

type Definitions = ReadonlyMap<string, readonly ElementContent[]>;

const DEFINITION_PREFIX = "user-content-fn-";

const COMPONENT = "FootnoteRef";

const isElement: Predicate.Refinement<RootContent, Element> = (node) => node.type === "element";

const isText: Predicate.Refinement<ElementContent, Text> = (node) => node.type === "text";

const propertyOf =
  (name: string): Transform<Element, string> =>
  (element) =>
    pipe(
      Option.fromNullishOr(element.properties[name]),
      Option.map(String),
      Option.getOrElse(() => ""),
    );

const hasProperty =
  (name: string): Predicate.Predicate<ElementContent> =>
  (node) =>
    isElement(node) && Predicate.hasProperty(node.properties, name);

const descendants: Transform<readonly RootContent[], readonly Element[]> = (children) =>
  pipe(
    children,
    Arr.filter(isElement),
    Arr.flatMap((element) => [element, ...descendants(element.children)]),
  );

const definitionContent: Transform<Element, readonly ElementContent[]> = (item) =>
  pipe(
    item.children,
    Arr.filter(isElement),
    Arr.filter(({ tagName }) => tagName === "p"),
    Arr.flatMap(({ children }) => children),
    Arr.filter((node) => !hasProperty("dataFootnoteBackref")(node)),
  );

const definitions: Transform<Root, Definitions> = (tree) =>
  new Map(
    pipe(
      descendants(tree.children),
      Arr.filter(
        (element) =>
          element.tagName === "li" && Str.startsWith(DEFINITION_PREFIX)(propertyOf("id")(element)),
      ),
      Arr.map((item) => [`#${propertyOf("id")(item)}`, definitionContent(item)] as const),
    ),
  );

const footnoteLink: Transform<Element, Option.Option<Element>> = (element) =>
  pipe(
    element.children,
    Arr.filter(isElement),
    Arr.head,
    Option.filter((link) => element.tagName === "sup" && hasProperty("dataFootnoteRef")(link)),
  );

const attribute: Transform<Readonly<{ name: string; value: string }>, MdxJsxAttribute> = ({
  name,
  value,
}) => ({ type: "mdxJsxAttribute", name, value });

const toPreview: Transform<
  Readonly<{ link: Element; content: readonly ElementContent[] }>,
  MdxJsxTextElementHast
> = ({ link, content }) => ({
  type: "mdxJsxTextElement",
  name: COMPONENT,
  attributes: [
    attribute({ name: "href", value: propertyOf("href")(link) }),
    attribute({ name: "id", value: propertyOf("id")(link) }),
    attribute({
      name: "label",
      value: pipe(
        link.children,
        Arr.filter(isText),
        Arr.map(({ value }) => value),
        Arr.join(""),
      ),
    }),
  ],
  children: [...content],
});

const previewOf: Transform<Definitions, Transform<Element, Option.Option<MdxJsxTextElementHast>>> =
  (found) => (element) =>
    pipe(
      footnoteLink(element),
      Option.flatMap((link) =>
        pipe(
          found.get(propertyOf("href")(link)),
          Option.fromUndefinedOr,
          Option.map((content) => toPreview({ link, content })),
        ),
      ),
    );

const isMdxFlow: Predicate.Refinement<RootContent, MdxJsxFlowElementHast> = (node) =>
  node.type === "mdxJsxFlowElement";

const onElements =
  <Node extends RootContent>(
    transform: Transform<Element, ElementContent>,
  ): Transform<Node, ElementContent | Node> =>
  (node) =>
    pipe(
      node,
      Option.liftPredicate(isElement),
      Option.map(transform),
      Option.orElse(() =>
        pipe(
          node,
          Option.liftPredicate(isMdxFlow),
          Option.map((flow): MdxJsxFlowElementHast => ({
            ...flow,
            children: pipe(flow.children, Arr.map(onElements<ElementContent>(transform))),
          })),
        ),
      ),
      Option.getOrElse((): ElementContent | Node => node),
    );

const transformElement: Transform<Definitions, Transform<Element, ElementContent>> =
  (found) => (element) =>
    pipe(
      previewOf(found)(element),
      Option.getOrElse((): ElementContent => {
        const transform = onElements<ElementContent>(transformElement(found));
        return { ...element, children: pipe(element.children, Arr.map(transform)) };
      }),
    );

const rehypeFootnotePreview = (): Transform<Root, Root> => (tree) => {
  const transform = onElements<RootContent>(transformElement(definitions(tree)));
  return { ...tree, children: pipe(tree.children, Arr.map(transform)) };
};

export type { Transform };
export { rehypeFootnotePreview };
