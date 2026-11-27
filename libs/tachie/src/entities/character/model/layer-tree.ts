import type { Layer, Psd } from "ag-psd";
import { Array as Arr, Option, String as Str, pipe } from "effect";

import { encodeLayerName } from "#/shared/lib/layer-name.ts";

export type FlipKind = "x" | "y" | "xy";

export type Flip = "none" | FlipKind;

export const FLIP_KINDS: readonly FlipKind[] = ["x", "y", "xy"];

export interface LayerNode {
  readonly index: number;
  readonly name: string;
  readonly path: string;
  readonly parent: Option.Option<number>;
  readonly children: readonly number[];
  readonly visible: boolean;
  readonly layer: Layer;
}

export interface FlipPair {
  readonly kinds: readonly FlipKind[];
  readonly original: number;
  readonly mirror: number;
}

export interface LayerTree {
  readonly width: number;
  readonly height: number;
  readonly nodes: readonly LayerNode[];
  readonly roots: readonly number[];
  readonly byPath: ReadonlyMap<string, number>;
  readonly forced: readonly number[];
  readonly radios: readonly (readonly number[])[];
  readonly flips: readonly FlipPair[];
  readonly synced: ReadonlyMap<number, readonly number[]>;
}

const NEXT = 1;
const FLIP_SUFFIXES: ReadonlyMap<string, FlipKind> = new Map([
  ["flipx", "x"],
  ["flipy", "y"],
  ["flipxy", "xy"],
]);

const startsWithMarker = (name: string, marker: string): boolean =>
  name.length > marker.length && Str.startsWith(marker)(name);

export const isRadioName = (name: string): boolean =>
  startsWithMarker(name, "*") && !Str.startsWith("**")(name);

export const isForcedName = (name: string): boolean => startsWithMarker(name, "!") && name !== "!?";

const nameOf = (layer: Layer): string => layer.name ?? "";

const segmentOf = (siblings: readonly Layer[], position: number): string => {
  const name = pipe(
    Arr.get(siblings, position),
    Option.map(nameOf),
    Option.getOrElse(() => ""),
  );
  const earlier = pipe(
    siblings,
    Arr.take(position),
    Arr.filter((layer) => nameOf(layer) === name),
    Arr.length,
  );
  if (earlier === Arr.length([])) {
    return encodeLayerName(name);
  }
  return encodeLayerName(`${name}\\${String(earlier)}`);
};

interface Parent {
  readonly index: number;
  readonly path: string;
}

const joinPath = (parent: Option.Option<Parent>, segment: string): string =>
  Option.match(parent, { onNone: () => segment, onSome: ({ path }) => `${path}/${segment}` });

interface Placement {
  readonly layer: Layer;
  readonly index: number;
  readonly path: string;
}

const flatten = (
  layers: readonly Layer[],
  parent: Option.Option<Parent>,
  start: number,
): readonly LayerNode[] => {
  const placed = ({ layer, index, path }: Placement): readonly LayerNode[] => {
    const descendants = flatten(layer.children ?? [], Option.some({ index, path }), index + NEXT);
    const node: LayerNode = {
      index,
      name: nameOf(layer),
      path,
      parent: pipe(
        parent,
        Option.map(({ index: parentIndex }) => parentIndex),
      ),
      children: pipe(
        descendants,
        Arr.filter((child) => Option.contains(child.parent, index)),
        Arr.map((child) => child.index),
      ),
      visible: layer.hidden !== true,
      layer,
    };
    return [node, ...descendants];
  };
  const flat: LayerNode[] = [];
  for (const [position, layer] of layers.entries()) {
    const index = start + flat.length;
    const path = joinPath(parent, segmentOf(layers, position));
    flat.push(...placed({ layer, index, path }));
  }
  return flat;
};

const siblingListsOf = (
  nodes: readonly LayerNode[],
  roots: readonly number[],
): readonly (readonly number[])[] => [
  roots,
  ...pipe(
    nodes,
    Arr.map(({ children }) => children),
  ),
];

const nodeAt = (nodes: readonly LayerNode[], index: number): Option.Option<LayerNode> =>
  Arr.get(nodes, index);

const flipKindsOf = (tokens: readonly string[]): readonly FlipKind[] =>
  pipe(
    tokens,
    Arr.reverse,
    Arr.takeWhile((token) => FLIP_SUFFIXES.has(token)),
    Arr.flatMap((token) => Option.toArray(Option.fromNullishOr(FLIP_SUFFIXES.get(token)))),
  );

const flipOf =
  (nodes: readonly LayerNode[], siblings: readonly number[]) =>
  (mirror: LayerNode): Option.Option<FlipPair> => {
    const tokens = Str.split(":")(mirror.name);
    const kinds = flipKindsOf(tokens);
    const originalName = pipe(tokens, Arr.take(tokens.length - kinds.length), Arr.join(":"));
    return pipe(
      siblings,
      Arr.findFirst((index) =>
        pipe(
          nodeAt(nodes, index),
          Option.exists(({ name }) => name === originalName),
        ),
      ),
      Option.filter(() => Arr.isReadonlyArrayNonEmpty(kinds) && originalName !== ""),
      Option.map((original): FlipPair => ({ kinds, original, mirror: mirror.index })),
    );
  };

const syncedPairs = (
  tree: Pick<LayerTree, "nodes" | "byPath">,
  original: number,
  mirror: number,
): readonly (readonly [number, number])[] =>
  pipe(
    Option.all([nodeAt(tree.nodes, original), nodeAt(tree.nodes, mirror)]),
    Option.match({
      onNone: () => Arr.empty<readonly [number, number]>(),
      onSome: ([from, to]) =>
        pipe(
          from.children,
          Arr.flatMap((child) =>
            pipe(
              nodeAt(tree.nodes, child),
              Option.flatMap(({ path }) =>
                Option.fromNullishOr(
                  tree.byPath.get(`${to.path}${Str.slice(from.path.length)(path)}`),
                ),
              ),
              Option.map((pair): readonly [number, number] => [child, pair]),
              Option.toArray,
            ),
          ),
          Arr.flatMap(([child, pair]) => [
            [child, pair] as const,
            ...syncedPairs(tree, child, pair),
          ]),
        ),
    }),
  );

const indicesOf = (
  nodes: readonly LayerNode[],
  keep: (node: LayerNode) => boolean,
): readonly number[] =>
  pipe(
    nodes,
    Arr.filter(keep),
    Arr.map(({ index }) => index),
  );

const radiosOf = (
  nodes: readonly LayerNode[],
  lists: readonly (readonly number[])[],
): readonly (readonly number[])[] =>
  pipe(
    lists,
    Arr.map(
      Arr.filter((index) =>
        pipe(
          nodeAt(nodes, index),
          Option.exists(({ name }) => isRadioName(name)),
        ),
      ),
    ),
    Arr.filter(Arr.isReadonlyArrayNonEmpty),
  );

const flipsOf = (
  nodes: readonly LayerNode[],
  lists: readonly (readonly number[])[],
): readonly FlipPair[] =>
  pipe(
    lists,
    Arr.flatMap((siblings) =>
      pipe(
        siblings,
        Arr.flatMap((index) => Option.toArray(nodeAt(nodes, index))),
        Arr.flatMap((node) => Option.toArray(flipOf(nodes, siblings)(node))),
      ),
    ),
  );

const syncedOf = (
  tree: Pick<LayerTree, "nodes" | "byPath">,
  flips: readonly FlipPair[],
): ReadonlyMap<number, readonly number[]> =>
  new Map(
    pipe(
      flips,
      Arr.flatMap(({ original, mirror }) => syncedPairs(tree, original, mirror)),
      Arr.flatMap(([child, pair]) => [
        [child, [child, pair]] as const,
        [pair, [child, pair]] as const,
      ]),
    ),
  );

export const buildLayerTree = (psd: Psd): LayerTree => {
  const nodes = flatten(psd.children ?? [], Option.none(), Arr.length([]));
  const roots = indicesOf(nodes, ({ parent }) => Option.isNone(parent));
  const byPath: ReadonlyMap<string, number> = new Map(
    pipe(
      nodes,
      Arr.map(({ path, index }) => [path, index] as const),
    ),
  );
  const lists = siblingListsOf(nodes, roots);
  const flips = flipsOf(nodes, lists);
  return {
    width: psd.width,
    height: psd.height,
    nodes,
    roots,
    byPath,
    forced: indicesOf(nodes, ({ name }) => isForcedName(name)),
    radios: radiosOf(nodes, lists),
    flips,
    synced: syncedOf({ nodes, byPath }, flips),
  };
};
