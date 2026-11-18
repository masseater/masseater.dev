import { Array as Arr, Option, String as Str, pipe } from "effect";
import type { Element, Root as HtmlRoot } from "hast";
import { fromHtml } from "hast-util-from-html";
import { toString as htmlText } from "hast-util-to-string";
import type { Heading, Root, RootContent, Table, TableRow } from "mdast";
import { toString as textOf } from "mdast-util-to-string";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { visit } from "unist-util-visit";

const HEADER_ROWS = 1;
const NEXT = 1;
const SINGLE = 1;

export interface Section {
  readonly title: string;
  readonly depth: number;
  readonly nodes: readonly RootContent[];
}

export const parseMarkdown = (source: string): Root =>
  unified().use(remarkParse).use(remarkGfm).parse(source);

export const parseHtml = (source: string): HtmlRoot => fromHtml(source, { fragment: true });

export const cellsOf = (row: TableRow): readonly string[] =>
  pipe(
    row.children,
    Arr.map((cell) => textOf(cell)),
  );

export const codeAt =
  (column: number) =>
  (row: TableRow): Option.Option<string> =>
    pipe(
      Arr.get(row.children, column),
      Option.filter((cell) => cell.children.length === SINGLE),
      Option.flatMap((cell) => Arr.head(cell.children)),
      Option.filter((child) => child.type === "inlineCode"),
      Option.map((child) => textOf(child)),
    );

export const bodyRows = (table: Table): readonly TableRow[] =>
  pipe(table.children, Arr.drop(HEADER_ROWS));

export const sections = (root: Root): readonly Section[] => {
  const headings = pipe(
    root.children,
    Arr.map((node, index) =>
      pipe(
        Option.some(node),
        Option.filter((candidate): candidate is Heading => candidate.type === "heading"),
        Option.map((heading) => ({ heading, index })),
      ),
    ),
    Arr.getSomes,
  );
  return pipe(
    headings,
    Arr.map(({ heading, index }, position) => {
      const end = pipe(
        Arr.get(headings, position + NEXT),
        Option.map((next) => next.index),
        Option.getOrElse(() => root.children.length),
      );
      return {
        title: textOf(heading),
        depth: heading.depth,
        nodes: pipe(root.children, Arr.take(end), Arr.drop(index + NEXT)),
      };
    }),
  );
};

export const tablesOf = (section: Section): readonly Table[] =>
  pipe(
    section.nodes,
    Arr.filter((node): node is Table => node.type === "table"),
  );

export const sectionTitled =
  (title: string) =>
  (root: Root): Option.Option<Section> =>
    pipe(
      sections(root),
      Arr.findFirst((section) => section.title === title),
    );

export const inlineCodes = (node: RootContent): readonly string[] => {
  const found: string[] = [];
  visit(node, "inlineCode", (code) => {
    found.push(code.value);
  });
  return found;
};

export const htmlOf = (node: RootContent): string => {
  const found: string[] = [];
  visit(node, (child) => {
    if (child.type === "html" || child.type === "text") {
      found.push(child.value);
    }
  });
  return Arr.join(found, "");
};

export const textOfHtml = (node: Element): string => Str.trim(htmlText(node));

export const listOf = (text: string): readonly string[] =>
  pipe(
    Str.split(Str.trim(text), ","),
    Arr.map((part) => Str.toLowerCase(Str.trim(part))),
    Arr.filter((part) => Str.isNonEmpty(part) && part !== "none"),
    Arr.sortBy(Str.Order),
  );
