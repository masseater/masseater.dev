import { Option, pipe } from "effect";

import { blockAt, layoutOf, viewOf } from "./blend-blocks.ts";
import type { Block, Layout } from "./blend-blocks.ts";

interface Thumbnail {
  readonly width: number;
  readonly height: number;
  readonly rgba: Uint8Array;
}

const THUMBNAIL = "TEST";
const RENDER_INFO = "REND";
const INT_BYTES = 4;
const CHANNELS = 4;
const MAX_SIDE = 1024;
const MIN_SIDE = 1;

const pixelsOf = (bytes: Uint8Array, block: Block, little: boolean): Option.Option<Thumbnail> => {
  const view = viewOf(bytes);
  if (block.data + INT_BYTES + INT_BYTES > bytes.length) {
    return Option.none();
  }
  const width = view.getInt32(block.data, little);
  const height = view.getInt32(block.data + INT_BYTES, little);
  const start = block.data + INT_BYTES + INT_BYTES;
  const end = start + width * height * CHANNELS;
  const valid =
    width >= MIN_SIDE &&
    height >= MIN_SIDE &&
    width <= MAX_SIDE &&
    height <= MAX_SIDE &&
    end <= bytes.length;
  return Option.liftPredicate({ width, height, rgba: bytes.slice(start, end) }, () => valid);
};

const findThumbnail = (
  bytes: Uint8Array,
  offset: number,
  layout: Layout,
): Option.Option<Thumbnail> =>
  pipe(
    blockAt({ bytes, offset, layout }),
    Option.flatMap((block) => {
      if (block.code === THUMBNAIL) {
        return pixelsOf(bytes, block, layout.little);
      }
      if (block.code !== RENDER_INFO) {
        return Option.none();
      }
      return findThumbnail(bytes, block.data + block.length, layout);
    }),
  );

const blendThumbnail = (bytes: Uint8Array): Option.Option<Thumbnail> =>
  pipe(
    layoutOf(bytes),
    Option.flatMap((layout) => findThumbnail(bytes, layout.start, layout)),
  );

export { blendThumbnail };
export type { Thumbnail };
