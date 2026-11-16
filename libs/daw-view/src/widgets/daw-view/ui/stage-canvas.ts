import { Option, pipe } from "effect";

import { rollScaleOf } from "#/widgets/daw-view/model/layout.ts";
import { drawSpectrum, drawWave } from "#/widgets/daw-view/model/mix.ts";
import type { Model } from "#/widgets/daw-view/model/model.ts";
import { keyboardWidth } from "#/widgets/daw-view/model/roll-layout.ts";

import { drawArrange } from "./arrange.ts";
import type { Surfaces } from "./parts.ts";
import { drawRoll } from "./roll.ts";
import type { Shell } from "./shell.ts";

const NONE = 0;

const sizeOf = ({
  canvas,
}: CanvasRenderingContext2D): Readonly<{ width: number; height: number }> => ({
  width: canvas.width,
  height: canvas.height,
});

const paintMix = (shell: Shell, surfaces: Surfaces, time: number): void => {
  const { theme, peaks, shades } = shell.model.read();
  const { structure } = shell;
  drawWave({
    context: surfaces.wave,
    theme,
    structure,
    size: sizeOf(surfaces.wave),
    peaks,
    shades,
    position: time,
  });
  const levels = shell.transport.levels();
  if (Option.isSome(levels)) {
    const context = surfaces.spectrum;
    drawSpectrum({ context, theme, structure, size: sizeOf(context), ...levels.value });
  }
};

const paintArrange = (shell: Shell, context: CanvasRenderingContext2D): void => {
  const { theme, metrics, scale, session, selected } = shell.model.read();
  drawArrange({
    canvas: { context, theme, structure: shell.structure },
    viewport: {
      ...metrics.arrange,
      ratio: metrics.ratio,
      scale,
      scroll: shell.scrollers.arrange.node.scrollLeft,
      origin: NONE,
    },
    session,
    selected,
  });
};

interface RollPaint {
  readonly shell: Shell;
  readonly context: CanvasRenderingContext2D;
  readonly time: number;
}

const paintRoll = ({ shell, context, time }: RollPaint): void => {
  const current = shell.model.read();
  const { metrics } = current;
  drawRoll({
    canvas: { context, theme: current.theme, structure: shell.structure },
    viewport: {
      ...metrics.roll,
      ratio: metrics.ratio,
      scale: rollScaleOf(current),
      scroll: shell.scrollers.roll.node.scrollLeft,
      origin: keyboardWidth(metrics.roll.width),
    },
    layout: current.layout,
    roots: current.session.roots,
    time,
    hover: current.hover,
  });
};

interface Drawn {
  readonly model: Model;
  readonly scroll: number;
}

const isDrawn = (shell: Shell, drawn: Option.Option<Drawn>): boolean =>
  pipe(
    drawn,
    Option.exists(
      (last) =>
        last.model === shell.model.read() &&
        last.scroll === shell.scrollers.arrange.node.scrollLeft,
    ),
  );

export const canvasPainter = (shell: Shell): ((surfaces: Surfaces, time: number) => void) => {
  let drawn = Option.none<Drawn>();
  return (surfaces, time) => {
    paintMix(shell, surfaces, time);
    if (!isDrawn(shell, drawn)) {
      paintArrange(shell, surfaces.arrange);
      const scroll = shell.scrollers.arrange.node.scrollLeft;
      drawn = Option.some({ model: shell.model.read(), scroll });
    }
    paintRoll({ shell, context: surfaces.roll, time });
  };
};
