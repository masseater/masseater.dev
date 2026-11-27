import { Array as Arr, Option, String as Str, pipe } from "effect";

import { decodeStateValue } from "#/shared/lib/layer-name.ts";

import { findFaviewItem, findFavorite } from "./favorite-lookup.ts";
import type { FavoriteState, Favorites } from "./favorites.ts";
import { FLIP_KINDS } from "./layer-tree.ts";
import type { Flip, FlipPair, LayerTree } from "./layer-tree.ts";

export interface Visibility {
  readonly visible: readonly boolean[];
  readonly flip: Flip;
}

const FLIPS: readonly Flip[] = ["none", "x", "y", "xy"];
const PREFIX = 2;
const LAYER_TOKEN_MIN = 5;
const FLIP_TOKEN = 3;
const STEP = 1;
const TOKEN_KINDS: ReadonlyMap<string, "flip" | "layer" | "favorite" | "faview"> = new Map([
  ["L.", "flip"],
  ["v0", "layer"],
  ["v1", "layer"],
  ["F.", "favorite"],
  ["F_", "favorite"],
  ["S.", "faview"],
  ["S_", "faview"],
]);
const LOWEST = 0;

const directionOf = (pair: FlipPair, mirrored: boolean): readonly [number, number] => {
  if (mirrored) {
    return [pair.original, pair.mirror];
  }
  return [pair.mirror, pair.original];
};

class Resolver {
  private readonly visible: boolean[];
  private readonly priority: number[];
  private counter = LOWEST;
  private flip: Flip = "none";

  private readonly tree: LayerTree;
  private readonly favorites: Option.Option<Favorites>;

  public constructor(tree: LayerTree, favorites: Option.Option<Favorites>) {
    this.tree = tree;
    this.favorites = favorites;
    this.visible = pipe(
      tree.nodes,
      Arr.map(({ visible }) => visible),
    );
    this.priority = Arr.makeBy(tree.nodes.length, () => LOWEST);
  }

  public result(): Visibility {
    return { visible: [...this.visible], flip: this.flip };
  }

  public settle(): void {
    this.counter += STEP;
    for (const index of this.tree.forced) {
      this.place(index, true);
    }
    this.counter += STEP;
    for (const radio of this.tree.radios) {
      this.settleRadio(radio);
    }
    this.counter += STEP;
    this.setFlip(this.flip);
  }

  public restart(): void {
    this.priority.fill(LOWEST);
    this.counter = LOWEST;
  }

  public apply(token: string): void {
    const kind = TOKEN_KINDS.get(Str.slice(LOWEST, PREFIX)(token));
    if (kind === "flip") {
      this.flipToken(token);
    } else if (kind === "layer") {
      this.layerToken(token);
    } else if (kind === "favorite") {
      this.applyFavorite(Str.slice(STEP)(token));
    } else if (kind === "faview") {
      this.applyFaview(Str.slice(STEP)(token));
    }
  }

  private flipToken(token: string): void {
    if (token.length === FLIP_TOKEN) {
      this.applyFlip(Str.slice(PREFIX)(token));
    }
  }

  private layerToken(token: string): void {
    if (token.length >= LAYER_TOKEN_MIN) {
      this.applyLayer(Str.startsWith("v1")(token), Str.slice(PREFIX)(token));
    }
  }

  private place(index: number, visible: boolean): void {
    this.visible[index] = visible;
    this.priority[index] = this.counter;
  }

  private setVisible(index: number, visible: boolean): void {
    const group = Option.getOrElse(Option.fromNullishOr(this.tree.synced.get(index)), () => [
      index,
    ]);
    for (const member of group) {
      this.place(member, visible);
    }
  }

  private applyFlip(digit: string): void {
    pipe(
      Arr.get(FLIPS, Number(digit)),
      Option.filter(() => /^\d$/u.test(digit)),
      Option.map((flip) => {
        this.setFlip(flip);
        return flip;
      }),
    );
  }

  private applyLayer(visible: boolean, value: string): void {
    const found = pipe(
      decodeStateValue(value),
      Option.flatMap((path) => Option.fromNullishOr(this.tree.byPath.get(path))),
    );
    if (Option.isNone(found)) {
      return;
    }
    this.counter += STEP;
    this.setVisible(found.value, visible);
    if (visible) {
      this.showAncestors(found.value);
    }
  }

  private showAncestors(index: number): void {
    let parent = pipe(
      Arr.get(this.tree.nodes, index),
      Option.flatMap((node) => node.parent),
    );
    while (Option.isSome(parent)) {
      this.setVisible(parent.value, true);
      parent = pipe(
        Arr.get(this.tree.nodes, parent.value),
        Option.flatMap((node) => node.parent),
      );
    }
  }

  private applyState(state: FavoriteState, filtered: boolean): void {
    this.counter += STEP;
    const filter = Option.getOrElse(state.filter, () => Arr.empty<boolean>());
    for (const [index, visible] of state.visible.entries()) {
      const pass = Option.getOrElse(Arr.get(filter, index), () => !filtered);
      if (pass) {
        this.setVisible(index, visible);
      }
    }
  }

  private applyFavorite(value: string): void {
    const state = pipe(
      Option.all({ favorites: this.favorites, path: decodeStateValue(value) }),
      Option.flatMap(findFavorite),
    );
    if (Option.isSome(state)) {
      this.applyState(state.value, Option.isSome(state.value.filter));
    }
  }

  private applyFaview(value: string): void {
    const state = pipe(
      decodeStateValue(value),
      Option.map(Str.split("~")),
      Option.filter((parts) => parts.length === PREFIX),
      Option.flatMap(([path, item = ""]) =>
        pipe(
          this.favorites,
          Option.flatMap((favorites) => findFaviewItem({ favorites, path, item })),
        ),
      ),
    );
    if (Option.isSome(state)) {
      this.applyState(state.value, true);
    }
  }

  private rank(index: number): number {
    return this.priority[index] ?? LOWEST;
  }

  private settleRadio(radio: readonly number[]): void {
    let winner = Option.none<number>();
    for (const index of radio) {
      const outranks = !Option.exists(winner, (kept) => this.rank(kept) >= this.rank(index));
      if (this.visible[index] === true && outranks) {
        winner = Option.some(index);
      }
    }
    const shown = Option.orElse(winner, () => Arr.last(radio));
    for (const index of radio) {
      this.place(index, Option.contains(shown, index));
    }
  }

  private setFlip(flip: Flip): void {
    this.counter += STEP;
    const processed = new Set<FlipPair>();
    for (const kind of FLIP_KINDS) {
      for (const pair of this.tree.flips) {
        if (!processed.has(pair) && Arr.contains(pair.kinds, kind)) {
          processed.add(pair);
          this.swapPair(pair, flip === kind);
        }
      }
    }
    this.flip = flip;
  }

  private swapPair(pair: FlipPair, mirrored: boolean): void {
    const [from, to] = directionOf(pair, mirrored);
    if (this.visible[from] !== true && this.visible[to] !== true) {
      return;
    }
    const low = Math.min(this.rank(from), this.rank(to));
    const high = Math.max(this.rank(from), this.rank(to));
    this.visible[from] = false;
    this.visible[to] = true;
    this.priority[from] = low;
    this.priority[to] = high;
    this.copyChildren(from, to);
  }

  private pairedChild(from: number, to: number, child: number): Option.Option<number> {
    const nodes = Option.all({
      source: Arr.get(this.tree.nodes, from),
      target: Arr.get(this.tree.nodes, to),
      node: Arr.get(this.tree.nodes, child),
    });
    return pipe(
      nodes,
      Option.map(
        ({ source, target, node }) => `${target.path}${Str.slice(source.path.length)(node.path)}`,
      ),
      Option.flatMap((path) => Option.fromNullishOr(this.tree.byPath.get(path))),
    );
  }

  private copyChildren(from: number, to: number): void {
    const children = Option.getOrElse(
      Option.map(Arr.get(this.tree.nodes, from), ({ children: found }) => found),
      () => Arr.empty<number>(),
    );
    for (const child of children) {
      const pair = this.pairedChild(from, to, child);
      if (Option.isSome(pair)) {
        if (this.visible[pair.value] !== this.visible[child]) {
          this.place(pair.value, this.visible[child] === true);
        }
        this.copyChildren(child, pair.value);
      }
    }
  }
}

export const resolveVisibility = ({
  tree,
  favorites,
  state,
}: Readonly<{
  tree: LayerTree;
  favorites: Option.Option<Favorites>;
  state: string;
}>): Visibility => {
  const resolver = new Resolver(tree, favorites);
  resolver.settle();
  resolver.restart();
  for (const token of Str.split(" ")(state)) {
    resolver.apply(token);
  }
  resolver.settle();
  return resolver.result();
};
