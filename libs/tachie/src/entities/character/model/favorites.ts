import { Array as Arr, Option, String as Str, pipe } from "effect";

import { decodeLayerName, normalizeLayerPath } from "#/shared/lib/layer-name.ts";

import type { LayerTree } from "./layer-tree.ts";

export interface FavoriteState {
  readonly filter: Option.Option<readonly boolean[]>;
  readonly visible: readonly boolean[];
}

export interface FavoriteNode {
  readonly name: string;
  readonly children: readonly FavoriteNode[];
  readonly item: Option.Option<FavoriteState>;
  readonly filter: Option.Option<readonly boolean[]>;
}

export interface FaviewItem {
  readonly name: string;
  readonly state: FavoriteState;
}

export interface FaviewNode {
  readonly name: string;
  readonly items: readonly FaviewItem[];
  readonly children: readonly FaviewNode[];
}

export interface Favorites {
  readonly root: FavoriteNode;
  readonly faview: FaviewNode;
}

const HEADER = "[PSDToolFavorites-v1]";
const ENTRY_MARK = "//";
const SKIP = 1;
const NONE = 0;
const FAVIEW_MIN_BYTES = 2;
const DEFAULT_ROOT = "Favorites";

type EntryKind = "item" | "folder" | "filter";

interface Entry {
  readonly rest: readonly string[];
  readonly kind: EntryKind;
  readonly marks: readonly boolean[];
}

interface Section {
  readonly title: string;
  readonly lines: readonly string[];
}

const prefixesOf = (path: string): readonly string[] => {
  const segments = Str.split("/")(path);
  return pipe(
    segments,
    Arr.map((_segment, position) => Arr.join(Arr.take(segments, position + SKIP), "/")),
  );
};

const indexOfPath = (tree: LayerTree, path: string): readonly number[] =>
  Option.toArray(Option.fromNullishOr(tree.byPath.get(path)));

const marksOf = (tree: LayerTree, lines: readonly string[]): readonly boolean[] => {
  const marked = new Set(
    pipe(
      lines,
      Arr.flatMap((line) => Option.toArray(normalizeLayerPath(line))),
      Arr.flatMap(prefixesOf),
      Arr.flatMap((path) => indexOfPath(tree, path)),
    ),
  );
  return pipe(
    tree.nodes,
    Arr.map(({ index }) => marked.has(index)),
  );
};

const kindOf = (identifier: string): Option.Option<EntryKind> => {
  if (identifier === "item" || identifier === "folder" || identifier === "filter") {
    return Option.some(identifier);
  }
  return Option.none();
};

const decodePath = (path: string): Option.Option<readonly string[]> =>
  Option.all(pipe(Str.split("/")(path), Arr.map(decodeLayerName)));

const entryOf =
  (tree: LayerTree) =>
  ({ title, lines }: Section): Option.Option<Entry> => {
    const [name, identifier = "item"] = Str.split("~")(title);
    const parts = Option.all({ kind: kindOf(identifier), rest: decodePath(name) });
    return pipe(
      parts,
      Option.map(({ kind, rest }) => ({ kind, rest, marks: marksOf(tree, lines) })),
    );
  };

const settingOf = (line: string): readonly (readonly [string, string])[] =>
  pipe(
    Str.indexOf("/")(line),
    Option.flatMap((position) => {
      const key = decodeLayerName(Str.slice(NONE, position)(line));
      const value = decodeLayerName(Str.slice(position + SKIP)(line));
      return Option.all([key, value]);
    }),
    Option.toArray,
  );

const isMark = (line: string): boolean =>
  line.length > ENTRY_MARK.length && Str.startsWith(ENTRY_MARK)(line);

const sectionAt =
  (lines: readonly string[], marks: readonly number[]) =>
  (start: number, position: number): Section => {
    const end = Option.getOrElse(Arr.get(marks, position + SKIP), () => lines.length);
    const title = Option.getOrElse(Arr.get(lines, start), () => "");
    return {
      title: Str.slice(ENTRY_MARK.length)(title),
      lines: pipe(lines, Arr.take(end), Arr.drop(start + SKIP), Arr.filter(Str.isNonEmpty)),
    };
  };

const dropEmptyLast = (sections: readonly Section[]): readonly Section[] =>
  pipe(
    Arr.last(sections),
    Option.filter(({ lines }) => Arr.isReadonlyArrayEmpty(lines)),
    Option.match({ onNone: () => sections, onSome: () => Arr.dropRight(sections, SKIP) }),
  );

interface Parsed {
  readonly settings: ReadonlyMap<string, string>;
  readonly sections: readonly Section[];
}

const splitSections = (lines: readonly string[]): Parsed => {
  const marks = pipe(
    lines,
    Arr.map((line, index) => ({ line, index })),
    Arr.filter(({ line }) => isMark(line)),
    Arr.map(({ index }) => index),
  );
  const first = Option.getOrElse(Arr.head(marks), () => lines.length);
  const header = pipe(lines, Arr.take(first), Arr.filter(Str.isNonEmpty));
  const settings = pipe(header, Arr.flatMap(settingOf));
  const sections = pipe(marks, Arr.map(sectionAt(lines, marks)));
  return { settings: new Map(settings), sections: dropEmptyLast(sections) };
};

const lastOf = (entries: readonly Entry[], kind: EntryKind): Option.Option<readonly boolean[]> =>
  pipe(
    entries,
    Arr.filter((entry) => entry.kind === kind),
    Arr.last,
    Option.map(({ marks }) => marks),
  );

const passes = (filters: readonly (readonly boolean[])[], index: number): boolean =>
  pipe(
    filters,
    Arr.every((filter) => Option.getOrElse(Arr.get(filter, index), () => true)),
  );

const combineFilters = (
  filters: readonly (readonly boolean[])[],
  size: number,
): Option.Option<readonly boolean[]> =>
  pipe(
    Option.some(Arr.makeBy(size, (index) => passes(filters, index))),
    Option.filter(Arr.some((pass) => !pass)),
  );

interface Scope {
  readonly name: string;
  readonly entries: readonly Entry[];
  readonly filters: readonly (readonly boolean[])[];
  readonly size: number;
}

const childScope = (scope: Scope, name: string): Scope => ({
  ...scope,
  name,
  entries: pipe(
    scope.entries,
    Arr.filter(({ rest }) => Option.contains(Arr.head(rest), name)),
    Arr.map((entry) => ({ ...entry, rest: Arr.drop(entry.rest, SKIP) })),
  ),
});

const buildNode = (scope: Scope): FavoriteNode => {
  const own = pipe(
    scope.entries,
    Arr.filter(({ rest }) => Arr.isReadonlyArrayEmpty(rest)),
  );
  const filter = lastOf(own, "filter");
  const filters = [...scope.filters, ...Option.toArray(filter)];
  const nested = pipe(
    scope.entries,
    Arr.filter(({ rest }) => Arr.isReadonlyArrayNonEmpty(rest)),
  );
  const names = pipe(
    nested,
    Arr.flatMap(({ rest }) => Option.toArray(Arr.head(rest))),
    Arr.dedupe,
  );
  const visible = lastOf(own, "item");
  return {
    name: scope.name,
    filter,
    item: pipe(
      visible,
      Option.map((marks) => ({ visible: marks, filter: combineFilters(filters, scope.size) })),
    ),
    children: pipe(
      names,
      Arr.map((name) => buildNode(childScope({ ...scope, entries: nested, filters }, name))),
    ),
  };
};

const isFolder = (node: FavoriteNode): boolean =>
  Arr.isReadonlyArrayNonEmpty(node.children) && Option.isNone(node.filter);

const isGroupNode = (node: FavoriteNode): boolean =>
  Option.isNone(node.item) && (Option.isSome(node.filter) || isFolder(node));

const itemsOf = (node: FavoriteNode): readonly FaviewItem[] =>
  pipe(
    node.children,
    Arr.flatMap(({ name, item }) =>
      pipe(
        item,
        Option.map((state) => ({ name, state })),
        Option.toArray,
      ),
    ),
  );

const faviewOf = (node: FavoriteNode): FaviewNode => ({
  name: node.name,
  items: itemsOf(node),
  children: pipe(node.children, Arr.filter(isGroupNode), Arr.map(faviewOf)),
});

const countItems = (node: FaviewNode): number => {
  let count = node.items.length;
  for (const child of node.children) {
    count += countItems(child);
  }
  return count;
};

const isFaviewName = (name: string): boolean =>
  new TextEncoder().encode(name).length > FAVIEW_MIN_BYTES && Str.startsWith("*")(name);

const faviewRootsOf = (node: FavoriteNode): readonly FaviewNode[] => {
  const faview = faviewOf(node);
  if (isFaviewName(node.name) && countItems(faview) > NONE) {
    return [faview];
  }
  return pipe(node.children, Arr.flatMap(faviewRootsOf));
};

export const parseFavorites = ({
  text,
  tree,
}: Readonly<{ text: string; tree: LayerTree }>): Option.Option<Favorites> => {
  const lines = Str.split(/\r?\n/u)(text);
  if (!Option.contains(Arr.head(lines), HEADER)) {
    return Option.none();
  }
  const { settings, sections } = splitSections(Arr.drop(lines, SKIP));
  const name = Option.getOrElse(
    Option.fromNullishOr(settings.get("root-name")),
    () => DEFAULT_ROOT,
  );
  const drafts = pipe(sections, Arr.map(entryOf(tree)));
  const entries = Option.all(drafts);
  return pipe(
    entries,
    Option.map((found) =>
      buildNode({ name, entries: found, filters: [], size: tree.nodes.length }),
    ),
    Option.map((root) => ({ root, faview: { name, items: [], children: faviewRootsOf(root) } })),
  );
};
