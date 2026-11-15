import { Option } from "effect";

import { paintReadout } from "./readout.ts";
import type { Shell } from "./shell.ts";
import { canvasPainter } from "./stage-canvas.ts";
import { paintHeader } from "./stage-header.ts";
import { follow, paintHeads } from "./stage-heads.ts";

const readout = ({ parts, structure, model }: Shell, time: number): void => {
  const { layout, hover, theme } = model.read();
  paintReadout(parts.roll.now)({
    tracks: layout.tracks,
    hover,
    time,
    timing: structure,
    tint: theme.tint,
  });
};

export const painterOf = (shell: Shell): (() => boolean) => {
  const canvases = canvasPainter(shell);
  return () => {
    const time = shell.transport.position();
    paintHeader(shell)(time);
    follow(shell)(time);
    paintHeads(shell)(time);
    if (Option.isSome(shell.surfaces)) {
      canvases(shell.surfaces.value, time);
    }
    readout(shell, time);
    return shell.transport.playing();
  };
};
