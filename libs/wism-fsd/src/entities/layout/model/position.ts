import { Array as Arr, Option, pipe } from "effect";

import { isLayer, isParted } from "#/entities/kind/@x/layout.ts";
import type { Layers } from "#/entities/kind/@x/layout.ts";
import { matcher } from "#/shared/lib/glob.ts";
import type { Matcher } from "#/shared/lib/glob.ts";
import { joinAll, segments, stem } from "#/shared/lib/path.ts";

export type Position =
  | { readonly type: "ignored" }
  | { readonly type: "outside" }
  | { readonly type: "root" }
  | { readonly type: "loose" }
  | { readonly type: "unknownLayer"; readonly layer: string }
  | {
      readonly type: "layer";
      readonly layer: string;
      readonly slice: Option.Option<string>;
      readonly inner: Option.Option<string>;
    };

export type LayerPosition = Extract<Position, { readonly type: "layer" }>;
export interface LayerGlobs {
  readonly files: Matcher;
  readonly loose: Matcher;
  readonly entries: Matcher;
  readonly open: Matcher;
}

export interface Scope {
  readonly layers: Layers;
  readonly globs: LayerGlobs;
  readonly isSlice: (path: string) => boolean;
}

const ONE = 1;
export const IGNORED: Position = { type: "ignored" };
export const OUTSIDE: Position = { type: "outside" };
const ROOT: Position = { type: "root" };
const LOOSE: Position = { type: "loose" };

const layerAt = (
  layer: string,
  slice: Option.Option<string> = Option.none(),
  inner: Option.Option<string> = Option.none(),
): Position => ({ type: "layer", layer, slice, inner });

export const globsOf = (layers: Layers): LayerGlobs => ({
  files: matcher(layers.files),
  loose: matcher(layers.loose ?? []),
  entries: matcher(layers.entries ?? []),
  open: matcher(layers.open ?? []),
});

const sliceOf = (
  layer: string,
  tail: readonly string[],
  isSlice: (path: string) => boolean,
): LayerPosition => {
  const end = pipe(
    Arr.range(ONE, tail.length - ONE),
    Arr.findFirst((count) => isSlice(joinAll([layer, ...Arr.take(tail, count)]))),
    Option.getOrElse(() => ONE),
  );
  return {
    type: "layer",
    layer,
    slice: Option.some(joinAll(Arr.take(tail, end))),
    inner: Option.some(joinAll(Arr.drop(tail, end))),
  };
};

const locateSingle = ({ layers, globs }: Scope, single: string): Position => {
  if (globs.loose(single)) {
    return ROOT;
  }
  if (layers.moduleFiles !== true) {
    return LOOSE;
  }
  const name = stem(single);
  if (isLayer(layers)(name)) {
    return layerAt(name);
  }
  return { type: "unknownLayer", layer: name };
};

const locateParted = (
  scope: Scope,
  layer: string,
  tail: Arr.NonEmptyReadonlyArray<string>,
): Position => {
  const [only, ...more] = tail;
  const modules = scope.layers.moduleFiles === true;
  if (Arr.isReadonlyArrayNonEmpty(more) && modules) {
    return layerAt(layer, Option.some(only), Option.some(joinAll(more)));
  }
  if (Arr.isReadonlyArrayNonEmpty(more)) {
    return sliceOf(layer, tail, scope.isSlice);
  }
  if (modules) {
    return layerAt(layer, Option.some(stem(only)));
  }
  return layerAt(layer, Option.some(stem(only)), Option.some(only));
};

export const locateRest =
  (scope: Scope) =>
  (rest: string): Position => {
    const [layer, ...tail] = segments(rest);
    if (!Arr.isReadonlyArrayNonEmpty(tail)) {
      return locateSingle(scope, layer);
    }
    if (!isLayer(scope.layers)(layer)) {
      return { type: "unknownLayer", layer };
    }
    if (!isParted(scope.layers)(layer)) {
      return layerAt(layer);
    }
    return locateParted(scope, layer, tail);
  };

export const asLayer = (position: Position): Option.Option<LayerPosition> =>
  pipe(
    Option.some(position),
    Option.filter((value): value is LayerPosition => value.type === "layer"),
  );
