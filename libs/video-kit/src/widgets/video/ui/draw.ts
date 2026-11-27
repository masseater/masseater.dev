import type { ReactNode } from "react";

import type { Shot, Timeline } from "#/entities/cut/index.ts";

export type Draw = (shot: Shot) => ReactNode;

export type Frame = (shot: Shot, content: ReactNode) => ReactNode;

export type Layer = (timeline: Timeline) => ReactNode;

export interface Look {
  readonly backdrop: Layer;
  readonly frame: Frame;
  readonly overlay: Layer;
}
