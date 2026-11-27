import type { Layer } from "ag-psd";
import { Array as Arr, Option, pipe } from "effect";

import type { LayerNode, LayerTree } from "#/entities/character/index.ts";
import { operationOf } from "#/features/draw-layers/lib/blend.ts";
import { createSurface } from "#/features/draw-layers/lib/canvas.ts";
import type { Surface } from "#/features/draw-layers/lib/canvas.ts";

import { maskOf } from "./mask.ts";

const OPAQUE = 1;
const ORIGIN = 0;
const ALPHA_CHANNEL = 3;
const CHANNELS = 4;
const FULL_ALPHA = 255;

interface Stack {
  readonly base: number;
  readonly clips: readonly number[];
}

const stacksOf = (tree: LayerTree, indices: readonly number[]): readonly Stack[] => {
  const stacks: Stack[] = [];
  for (const index of indices) {
    const clipping = pipe(
      Arr.get(tree.nodes, index),
      Option.exists(({ layer }) => layer.clipping === true),
    );
    const last = Arr.last(stacks);
    if (clipping && Option.isSome(last)) {
      stacks[stacks.length - OPAQUE] = { ...last.value, clips: [...last.value.clips, index] };
    } else if (!clipping) {
      stacks.push({ base: index, clips: [] });
    }
  }
  return stacks;
};

const opaqueCopy = (
  surface: Surface,
  size: Readonly<{ width: number; height: number }>,
): Option.Option<Surface> =>
  pipe(
    createSurface(size),
    Option.map((copy) => {
      const pixels = surface.context.getImageData(ORIGIN, ORIGIN, size.width, size.height);
      for (let offset = ALPHA_CHANNEL; offset < pixels.data.length; offset += CHANNELS) {
        pixels.data[offset] = FULL_ALPHA;
      }
      copy.context.putImageData(pixels, ORIGIN, ORIGIN);
      return copy;
    }),
  );

interface Paint {
  readonly target: Surface;
  readonly source: HTMLCanvasElement;
  readonly layer: Layer;
  readonly opacity: number;
}

const paint = ({ target, source, layer, opacity }: Paint): void => {
  target.context.save();
  target.context.globalAlpha = opacity * (layer.opacity ?? OPAQUE);
  target.context.globalCompositeOperation = operationOf(layer.blendMode);
  target.context.drawImage(source, ORIGIN, ORIGIN);
  target.context.restore();
};

const drawPixels = (surface: Surface, layer: Layer): boolean =>
  pipe(
    Option.fromNullishOr(layer.canvas),
    Option.map((canvas) => {
      surface.context.drawImage(canvas, layer.left ?? ORIGIN, layer.top ?? ORIGIN);
      return true;
    }),
    Option.getOrElse(() => false),
  );

const applyMask = (surface: Surface, mask: Option.Option<HTMLCanvasElement>): void => {
  if (Option.isSome(mask)) {
    surface.context.globalCompositeOperation = "destination-in";
    surface.context.drawImage(mask.value, ORIGIN, ORIGIN);
    surface.context.globalCompositeOperation = "source-over";
  }
};

class Composer {
  private readonly tree: LayerTree;
  private readonly visible: readonly boolean[];

  public constructor(tree: LayerTree, visible: readonly boolean[]) {
    this.tree = tree;
    this.visible = visible;
  }

  public drawList(target: Surface, indices: readonly number[], opacity: number): void {
    for (const stack of stacksOf(this.tree, indices)) {
      this.drawStack(target, stack, opacity);
    }
  }

  private shown(index: number): Option.Option<LayerNode> {
    return pipe(
      Arr.get(this.tree.nodes, index),
      Option.filter(
        (node) => this.visible[index] === true && (node.layer.opacity ?? OPAQUE) > ORIGIN,
      ),
    );
  }

  private isPassThrough(node: LayerNode, stack: Stack): boolean {
    return (
      node.layer.blendMode === "pass through" &&
      Arr.isReadonlyArrayNonEmpty(node.children) &&
      Arr.isReadonlyArrayEmpty(stack.clips) &&
      Option.isNone(maskOf({ layer: node.layer, size: this.tree }))
    );
  }

  private drawStack(target: Surface, stack: Stack, opacity: number): void {
    const node = this.shown(stack.base);
    if (Option.isNone(node)) {
      return;
    }
    if (this.isPassThrough(node.value, stack)) {
      this.drawList(target, node.value.children, opacity * (node.value.layer.opacity ?? OPAQUE));
      return;
    }
    pipe(
      this.contentOf(node.value),
      Option.map((content) => this.clip(content, stack.clips)),
      Option.map((clipped) => {
        paint({ target, source: clipped.canvas, layer: node.value.layer, opacity });
        return clipped;
      }),
    );
  }

  private contentOf(node: LayerNode): Option.Option<Surface> {
    const surface = createSurface(this.tree);
    if (Option.isNone(surface)) {
      return Option.none();
    }
    if (Arr.isReadonlyArrayNonEmpty(node.children)) {
      this.drawList(surface.value, node.children, OPAQUE);
    } else if (!drawPixels(surface.value, node.layer)) {
      return Option.none();
    }
    applyMask(surface.value, maskOf({ layer: node.layer, size: this.tree }));
    return surface;
  }

  private clip(base: Surface, clips: readonly number[]): Surface {
    if (Arr.isReadonlyArrayEmpty(clips)) {
      return base;
    }
    const copy = opaqueCopy(base, this.tree);
    if (Option.isNone(copy)) {
      return base;
    }
    for (const index of clips) {
      this.drawStack(copy.value, { base: index, clips: [] }, OPAQUE);
    }
    copy.value.context.globalCompositeOperation = "destination-in";
    copy.value.context.drawImage(base.canvas, ORIGIN, ORIGIN);
    return copy.value;
  }
}

export const composeLayers = ({
  tree,
  visible,
}: Readonly<{ tree: LayerTree; visible: readonly boolean[] }>): Option.Option<HTMLCanvasElement> =>
  pipe(
    createSurface(tree),
    Option.map((surface) => {
      new Composer(tree, visible).drawList(surface, tree.roots, OPAQUE);
      return surface.canvas;
    }),
  );
