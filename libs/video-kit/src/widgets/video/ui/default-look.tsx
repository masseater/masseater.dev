import type { ReactNode } from "react";
import { AbsoluteFill } from "remotion";

import type { Shot, Timeline } from "#/entities/cut/index.ts";

import type { Look } from "./draw.ts";
import { ShotFrame } from "./shot-frame.tsx";
import { Tachie } from "./tachie.tsx";

export const DEFAULT_LOOK: Look = {
  backdrop: (): ReactNode => <AbsoluteFill className="bg-paper" />,
  frame: (shot: Shot, content: ReactNode): ReactNode => (
    <ShotFrame lines={shot.lines}>{content}</ShotFrame>
  ),
  overlay: (timeline: Timeline): ReactNode => <Tachie art={timeline.tachie} cuts={timeline.cuts} />,
};
