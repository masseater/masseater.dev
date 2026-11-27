import { Option } from "effect";

export interface Surface {
  readonly canvas: HTMLCanvasElement;
  readonly context: CanvasRenderingContext2D;
}

export const createSurface = ({
  width,
  height,
}: Readonly<{ width: number; height: number }>): Option.Option<Surface> => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return Option.map(Option.fromNullishOr(canvas.getContext("2d")), (context) => ({
    canvas,
    context,
  }));
};
