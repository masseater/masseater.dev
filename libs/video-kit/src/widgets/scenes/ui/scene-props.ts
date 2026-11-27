import type { ReactNode } from "react";

import type { TimedScene } from "#/entities/timeline/index.ts";
import type { Format } from "#/shared/config/index.ts";

export interface SceneProps {
  readonly timed: TimedScene;
  readonly format: Format;
  readonly number: number;
}

export type SceneOverride = (props: SceneProps) => ReactNode;
