import { Option, Record as Rec, pipe } from "effect";

export interface InputNode {
  readonly path: string;
  readonly children: Readonly<Record<string, InputNode>>;
}

interface Spec {
  readonly [name: string]: Spec;
}

const LEAF: Spec = {};
const AUTHOR: Spec = { email: LEAF, name: LEAF };
const BODY: Spec = { body: LEAF };
const TEXT: Spec = { title: LEAF, body: LEAF };

const GITHUB: Spec = {
  event: {
    issue: TEXT,
    pull_request: {
      ...TEXT,
      head: { ref: LEAF, label: LEAF, repo: { default_branch: LEAF } },
    },
    comment: BODY,
    review: BODY,
    review_comment: BODY,
    pages: { "*": { page_name: LEAF } },
    commits: { "*": { message: LEAF, author: AUTHOR } },
    head_commit: { message: LEAF, author: AUTHOR },
    discussion: TEXT,
  },
  head_ref: LEAF,
};

const build =
  (path: string) =>
  (spec: Spec): InputNode => ({
    path,
    children: pipe(
      spec,
      Rec.map((child, name) => build(`${path}.${name}`)(child)),
    ),
  });

export const ROOTS: Readonly<Record<string, InputNode>> = { github: build("github")(GITHUB) };

export const childOf =
  (name: string) =>
  (node: InputNode): Option.Option<InputNode> =>
    Rec.get(node.children, name);

export const isLeaf = (node: InputNode): boolean => Rec.isEmptyRecord(node.children);

export const elementsOf = (node: InputNode): readonly InputNode[] =>
  pipe(
    childOf("*")(node),
    Option.match({ onNone: () => Rec.values(node.children), onSome: (elem) => [elem] }),
  );
