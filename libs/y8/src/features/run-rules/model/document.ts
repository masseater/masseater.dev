import { Array as Arr, Match, Option, pipe } from "effect";

import type { MarkdownNode, Position } from "#/shared/config/index.ts";
import { FIELD, NODE_WORDS, TAGS } from "#/shared/native/index.ts";
import type { NodeType, SourceView } from "#/shared/native/index.ts";

const NONE = 0;
const ROOT = 0;
const NEXT = 1;
const SET = 1;
const TITLE = 1;
const LABEL = 2;

const LINKS = [
  "inline",
  "reference",
  "collapsed",
  "shortcut",
  "autolink",
  "email",
  "wiki",
] as const;

export interface Document {
  readonly root: MarkdownNode;
  readonly textOf: (node: MarkdownNode) => string;
  readonly positionOf: (offset: number) => Position;
}

type Data = Readonly<Record<string, unknown>>;

interface Fields {
  readonly view: SourceView;
  readonly type: NodeType;
  readonly first: number;
  readonly second: number;
}

const linkData = ({ view, first, second }: Fields): Data => ({
  link: pipe(
    LINKS,
    Arr.get(first),
    Option.getOrElse(() => LINKS[NONE]),
  ),
  destination: view.stringAt(second),
  title: view.stringAt(second + TITLE),
  label: view.stringAt(second + LABEL),
});

const listData = ({ first, second }: Fields): Data => ({
  ordered: first === SET,
  ...pipe(
    Option.some(second),
    Option.filter((value) => value !== NONE),
    Option.match({
      onNone: (): Data => ({}),
      onSome: (value): Data => ({ start: value - NEXT }),
    }),
  ),
});

const dataOf = (fields: Fields): Data =>
  Match.value(fields.type).pipe(
    Match.when("heading", (): Data => ({ level: fields.first, setext: fields.second === SET })),
    Match.when("codeBlock", (): Data => ({
      fenced: fields.first === SET,
      info: fields.view.stringAt(fields.second),
    })),
    Match.when("list", () => listData(fields)),
    Match.whenOr("footnoteDefinition", "footnoteReference", (): Data => ({
      label: fields.view.stringAt(fields.first),
    })),
    Match.whenOr("link", "image", () => linkData(fields)),
    Match.when("math", (): Data => ({ display: fields.first === SET })),
    Match.when("taskListMarker", (): Data => ({ checked: fields.first === SET })),
    Match.orElse((): Data => ({})),
  );

export const once = <Value>(make: () => Value): (() => Value) => {
  const made: Value[] = [];
  return () =>
    pipe(
      Arr.head(made),
      Option.getOrElse(() => {
        const value = make();
        made.push(value);
        return value;
      }),
    );
};

interface Tree {
  readonly at: (id: number) => MarkdownNode;
  readonly field: (id: number, field: number) => number;
}

const linked =
  (tree: Tree) =>
  (plusOne: number): Option.Option<MarkdownNode> =>
    pipe(
      Option.some(plusOne),
      Option.filter((value) => value !== NONE),
      Option.map((value) => tree.at(value - NEXT)),
    );

const childrenOf = (tree: Tree, id: number): readonly MarkdownNode[] => {
  const found: MarkdownNode[] = [];
  for (
    let child = tree.field(id, FIELD.firstChild);
    child !== NONE;
    child = tree.field(child - NEXT, FIELD.nextSibling)
  ) {
    found.push(tree.at(child - NEXT));
  }
  return found;
};

const nodeOf = (tree: Tree, view: SourceView, id: number): MarkdownNode => {
  const type = pipe(
    TAGS,
    Arr.get(tree.field(id, FIELD.tag)),
    Option.getOrElse((): NodeType => "other"),
  );
  const children = once(() => childrenOf(tree, id));
  const data = once(() =>
    dataOf({
      view,
      type,
      first: tree.field(id, FIELD.first),
      second: tree.field(id, FIELD.second),
    }),
  );
  return {
    type,
    id,
    start: tree.field(id, FIELD.start),
    end: tree.field(id, FIELD.end),
    get parent() {
      return pipe(linked(tree)(tree.field(id, FIELD.parent)), Option.getOrUndefined);
    },
    get children() {
      return children();
    },
    get data() {
      return data();
    },
  };
};

const treeOf = (view: SourceView): Tree => {
  const made = new Map<number, MarkdownNode>();
  const tree: Tree = {
    field: (id, field) => view.nodes[id * NODE_WORDS + field] ?? NONE,
    at: (id) =>
      pipe(
        Option.fromNullishOr(made.get(id)),
        Option.getOrElse(() => {
          const node = nodeOf(tree, view, id);
          made.set(id, node);
          return node;
        }),
      ),
  };
  return tree;
};

const positionIn =
  (view: SourceView) =>
  (offset: number): Position => {
    const line = Math.max(
      view.lineStarts.findLastIndex((start) => start <= offset),
      ROOT,
    );
    const start = view.lineStarts[line] ?? NONE;
    return { line: line + NEXT, column: view.slice(start, offset).length + NEXT };
  };

export const documentOf = (view: SourceView): Option.Option<Document> =>
  pipe(
    Option.some(view),
    Option.filter(({ nodeCount }) => nodeCount !== NONE),
    Option.map((source): Document => ({
      root: treeOf(source).at(ROOT),
      textOf: (node) => source.slice(node.start, node.end),
      positionOf: positionIn(source),
    })),
  );
