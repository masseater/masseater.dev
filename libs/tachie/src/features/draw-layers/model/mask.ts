import type { Layer } from "ag-psd";
import { Option, pipe } from "effect";

import type { LayerTree } from "#/entities/character/index.ts";
import { createSurface } from "#/features/draw-layers/lib/canvas.ts";

const ORIGIN = 0;
const CHANNELS = 4;
const ALPHA_CHANNEL = 3;
const FULL = 255;
const BLACK = 0;

const masks = new WeakMap<Layer, Option.Option<HTMLCanvasElement>>();

const alphaMask = (
  layer: Layer,
  size: Pick<LayerTree, "width" | "height">,
): Option.Option<HTMLCanvasElement> => {
  const enabled = pipe(
    Option.fromNullishOr(layer.mask),
    Option.filter(({ disabled }) => disabled !== true),
  );
  return pipe(
    enabled,
    Option.flatMap((mask) =>
      Option.all({ mask: Option.some(mask), source: Option.fromNullishOr(mask.canvas) }),
    ),
    Option.flatMap(({ mask, source }) =>
      Option.all({
        mask: Option.some(mask),
        source: Option.some(source),
        target: createSurface(size),
        read: createSurface(source),
      }),
    ),
    Option.map(({ mask, source, target, read }) => {
      read.context.drawImage(source, ORIGIN, ORIGIN);
      const pixels = read.context.getImageData(ORIGIN, ORIGIN, source.width, source.height);
      for (let offset = ORIGIN; offset < pixels.data.length; offset += CHANNELS) {
        pixels.data[offset + ALPHA_CHANNEL] = pixels.data[offset] ?? FULL;
        pixels.data.fill(BLACK, offset, offset + ALPHA_CHANNEL);
      }
      target.context.fillStyle = `rgba(0, 0, 0, ${String((mask.defaultColor ?? FULL) / FULL)})`;
      target.context.fillRect(ORIGIN, ORIGIN, size.width, size.height);
      target.context.putImageData(pixels, mask.left ?? ORIGIN, mask.top ?? ORIGIN);
      return target.canvas;
    }),
  );
};

export const maskOf = ({
  layer,
  size,
}: Readonly<{
  layer: Layer;
  size: Pick<LayerTree, "width" | "height">;
}>): Option.Option<HTMLCanvasElement> =>
  masks.getOrInsertComputed(layer, () => alphaMask(layer, size));
