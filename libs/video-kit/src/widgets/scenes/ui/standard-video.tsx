import type { ReactNode } from "react";
import { AbsoluteFill } from "remotion";

import type { Timeline } from "#/entities/timeline/index.ts";
import { useFonts } from "#/shared/ui/use-fonts.ts";
import { shownText } from "#/widgets/scenes/model/shown-text.ts";

import { Backdrop } from "./backdrop.tsx";
import { Progress } from "./progress.tsx";
import type { SceneOverride } from "./scene-props.ts";
import { Scenes } from "./scenes.tsx";
import { Soundtrack } from "./soundtrack.tsx";

const NO_OVERRIDES: Readonly<Record<string, SceneOverride>> = {};

export const StandardVideo = ({
  timeline,
  overrides = NO_OVERRIDES,
}: Readonly<{
  timeline: Timeline;
  overrides?: Readonly<Record<string, SceneOverride>>;
}>): ReactNode => {
  const ready = useFonts(shownText(timeline));
  return (
    <AbsoluteFill data-format={timeline.format} lang="ja">
      <Backdrop />
      <Soundtrack timeline={timeline} />
      {ready && <Scenes overrides={overrides} timeline={timeline} />}
      <Progress total={timeline.durationInFrames} />
    </AbsoluteFill>
  );
};
