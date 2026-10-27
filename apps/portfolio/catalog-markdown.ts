import { Array as Arr, Option, String as Str, pipe } from "effect";
import type { Predicate } from "effect";
import type {
  Heading,
  Image,
  Link,
  Paragraph,
  PhrasingContent,
  RootContent,
  Table,
  TableRow,
} from "mdast";
import type { LeafDirective } from "mdast-util-directive";
import { toString } from "mdast-util-to-string";
import remarkDirective from "remark-directive";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";

import type {
  CatalogExample,
  CatalogItem,
  ImageCredit,
} from "./src/entities/technique/model/catalog.ts";

const NEXT = 1;
const SINGLE = 1;
const HEADER_ROWS = 1;
const GROUP_DEPTH = 2;
const ITEM_DEPTH = 3;
const CREDIT_PREFIX = "画像: ";
const YOUTUBE = "youtube";

type Nodes = readonly RootContent[];

type Fn<Input, Output> = (input: Input) => Output;

const isHeading: Predicate.Refinement<RootContent, Heading> = (node): node is Heading =>
  node.type === "heading";

const isHeadingOf =
  (depth: number): Fn<RootContent, boolean> =>
  (node) =>
    isHeading(node) && node.depth === depth;

const isParagraph: Predicate.Refinement<RootContent, Paragraph> = (node): node is Paragraph =>
  node.type === "paragraph";

const isTable: Predicate.Refinement<RootContent, Table> = (node): node is Table =>
  node.type === "table";

const isLeaf: Predicate.Refinement<RootContent, LeafDirective> = (node): node is LeafDirective =>
  node.type === "leafDirective";

const isImage: Predicate.Refinement<PhrasingContent, Image> = (node): node is Image =>
  node.type === "image";

const isLink: Predicate.Refinement<PhrasingContent, Link> = (node): node is Link =>
  node.type === "link";

const textOf: Fn<RootContent, string> = (node) => toString(node);

const linksOf: Fn<readonly PhrasingContent[], readonly CatalogExample[]> = (children) =>
  pipe(
    children,
    Arr.filter(isLink),
    Arr.map((link): CatalogExample => ({ kind: "link", href: link.url, label: toString(link) })),
  );

const imageOf: Fn<RootContent, Option.Option<Image>> = (node) =>
  pipe(
    Option.liftPredicate(node, isParagraph),
    Option.filter(({ children }) => children.length === SINGLE),
    Option.flatMap(({ children }) => Arr.head(children)),
    Option.filter(isImage),
  );

const isCredit: Fn<RootContent, boolean> = (node) =>
  isParagraph(node) && Str.startsWith(CREDIT_PREFIX)(textOf(node));

const creditOf: Fn<Option.Option<RootContent>, ImageCredit> = (node) =>
  pipe(
    node,
    Option.filter(isParagraph),
    Option.filter(isCredit),
    Option.map((line) => ({
      text: pipe(textOf(line), Str.replace(CREDIT_PREFIX, "")),
      href: pipe(
        line.children,
        Arr.filter(isLink),
        Arr.head,
        Option.map(({ url }) => url),
        Option.getOrElse(() => ""),
      ),
    })),
    Option.getOrElse(() => ({ text: "", href: "" })),
  );

const youtubeOf: Fn<RootContent, Option.Option<CatalogExample>> = (node) =>
  pipe(
    Option.liftPredicate(node, isLeaf),
    Option.filter(({ name }) => name === YOUTUBE),
    Option.flatMap((leaf) =>
      pipe(
        Option.fromNullishOr(leaf.attributes),
        Option.flatMap((attributes) => Option.fromNullishOr(attributes["id"])),
        Option.map((id): CatalogExample => ({ kind: "youtube", id, title: toString(leaf) })),
      ),
    ),
  );

const imageExampleAt = (body: Nodes, position: number): Option.Option<CatalogExample> =>
  pipe(
    Arr.get(body, position),
    Option.flatMap(imageOf),
    Option.map((image): CatalogExample => ({
      kind: "image",
      src: image.url,
      alt: pipe(
        Option.fromNullishOr(image.alt),
        Option.getOrElse(() => ""),
      ),
      credit: creditOf(Arr.get(body, position + NEXT)),
    })),
  );

const examplesOf = (body: Nodes): readonly CatalogExample[] =>
  pipe(
    body,
    Arr.flatMap((node, position) =>
      pipe(
        imageExampleAt(body, position),
        Option.orElse(() => youtubeOf(node)),
        Option.toArray,
      ),
    ),
  );

const summaryOf = (body: Nodes): readonly string[] =>
  pipe(
    body,
    Arr.filter((node) => isParagraph(node) && Option.isNone(imageOf(node)) && !isCredit(node)),
    Arr.map(textOf),
  );

const groupAt = (children: Nodes, index: number): string =>
  pipe(
    Arr.take(children, index),
    Arr.findLast(isHeadingOf(GROUP_DEPTH)),
    Option.map(textOf),
    Option.getOrElse(() => ""),
  );

const sectionItem = (children: Nodes, index: number): CatalogItem => {
  const body = pipe(
    children,
    Arr.drop(index + NEXT),
    Arr.takeWhile((node) => !isHeading(node)),
  );
  return {
    group: groupAt(children, index),
    name: pipe(
      Arr.get(children, index),
      Option.map(textOf),
      Option.getOrElse(() => ""),
    ),
    summary: summaryOf(body),
    examples: examplesOf(body),
  };
};

const cellText = (cell: Option.Option<RootContent>): string =>
  pipe(
    cell,
    Option.map(textOf),
    Option.getOrElse(() => ""),
  );

const rowItem =
  (group: string): Fn<TableRow, CatalogItem> =>
  ({ children: [name, summary, example] }) => ({
    group,
    name: cellText(Option.fromNullishOr(name)),
    summary: [cellText(Option.fromNullishOr(summary))],
    examples: pipe(
      Option.fromNullishOr(example),
      Option.map(({ children }) => linksOf(children)),
      Option.getOrElse(() => []),
    ),
  });

const tableItems = (children: Nodes, index: number): readonly CatalogItem[] => {
  const toItem = rowItem(groupAt(children, index));
  return pipe(
    Arr.get(children, index),
    Option.filter(isTable),
    Option.map(({ children: rows }) => Arr.drop(rows, HEADER_ROWS)),
    Option.getOrElse((): readonly TableRow[] => []),
    Arr.map(toItem),
  );
};

const itemsAt = (children: Nodes, index: number): readonly CatalogItem[] =>
  pipe(
    Arr.get(children, index),
    Option.filter(isHeadingOf(ITEM_DEPTH)),
    Option.map(() => [sectionItem(children, index)]),
    Option.getOrElse(() => tableItems(children, index)),
  );

const catalogOf = (markdown: string): readonly CatalogItem[] => {
  const { children } = unified()
    .use(remarkParse)
    .use(remarkFrontmatter)
    .use(remarkGfm)
    .use(remarkDirective)
    .parse(markdown);
  return pipe(
    children,
    Arr.flatMap((_node, index) => itemsAt(children, index)),
  );
};

export { catalogOf };
