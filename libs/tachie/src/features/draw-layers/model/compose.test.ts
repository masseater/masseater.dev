import { describe, expect, it } from "@effect/vitest";
import { Option, pipe } from "effect";

import { buildLayerTree, resolveVisibility } from "#/entities/character/index.ts";
import { characterRoundTrip } from "#/shared/lib/character.test.support.ts";

import { composeLayers } from "./compose.ts";

const tree = buildLayerTree(characterRoundTrip());

const composed = (state: string): Option.Option<HTMLCanvasElement> =>
  composeLayers({
    tree,
    visible: resolveVisibility({ tree, favorites: Option.none(), state }).visible,
  });

const PIXEL = 1;
const EMPTY = 0;

const colorAt = ({
  canvas,
  left,
  top,
}: Readonly<{ canvas: Option.Option<HTMLCanvasElement>; left: number; top: number }>): string =>
  pipe(
    canvas,
    Option.flatMap((found) => Option.fromNullishOr(found.getContext("2d"))),
    Option.map((context) => context.getImageData(left, top, PIXEL, PIXEL).data),
    Option.map(
      ([red = EMPTY, green = EMPTY, blue = EMPTY, alpha = EMPTY]) =>
        `rgba(${String(red)}, ${String(green)}, ${String(blue)}, ${String(alpha)})`,
    ),
    Option.getOrElse(() => "none"),
  );

describe("composeLayers", () => {
  const canvas = composed("");

  it("draws the visible layers in order", () => {
    expect(colorAt({ canvas, left: 30, top: 20 })).toBe("rgba(32, 32, 255, 255)");
    expect(colorAt({ canvas, left: 30, top: 44 })).toBe("rgba(64, 0, 0, 255)");
  });

  it("hides a clipped layer while the layer below it is hidden", () => {
    expect(colorAt({ canvas, left: 20, top: 52 })).toBe("rgba(192, 192, 192, 255)");
  });

  it("clips a layer to the one below it", () => {
    const flipped = composed("L.1");
    expect(colorAt({ canvas: flipped, left: 20, top: 52 })).toBe("rgba(0, 64, 0, 255)");
    expect(colorAt({ canvas: flipped, left: 40, top: 52 })).toBe("rgba(0, 0, 0, 0)");
  });

  it("skips the layers inside a hidden folder", () => {
    expect(colorAt({ canvas, left: 2, top: 2 })).toBe("rgba(0, 0, 0, 0)");
  });

  it("draws a chosen pattern instead of the default", () => {
    expect(colorAt({ canvas: composed("v1.!口/*あ"), left: 30, top: 41 })).toBe(
      "rgba(255, 0, 0, 255)",
    );
  });
});
