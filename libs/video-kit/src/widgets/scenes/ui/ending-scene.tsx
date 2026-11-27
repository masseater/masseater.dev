import type { ReactNode } from "react";
import { useCurrentFrame } from "remotion";

import type { Segment } from "#/entities/script/index.ts";
import { markProgress, slamIn } from "#/shared/ui/motion.ts";
import { headlineSize } from "#/widgets/scenes/model/headline-size.ts";

import { Credits } from "./credits.tsx";
import { EndingTag } from "./ending-tag.tsx";
import { Headline } from "./headline.tsx";
import { SceneFrame } from "./scene-frame.tsx";
import type { SceneProps } from "./scene-props.ts";

const SLAM_AT = 3;
const MARK_AT = 8;

export const EndingScene = ({
  timed,
  format,
  title,
  credits,
}: Readonly<SceneProps & { title: readonly Segment[]; credits: readonly string[] }>): ReactNode => {
  const frame = useCurrentFrame();
  const size = headlineSize({ segments: title, format, slot: "title" });
  return (
    <SceneFrame caption={false} timed={timed} whip>
      <div className="flex flex-1 flex-col items-center justify-center gap-9">
        <EndingTag frame={frame} />
        <Headline
          mark={markProgress({ frame, at: MARK_AT })}
          motion={slamIn({ frame, at: SLAM_AT })}
          segments={title}
          size={size}
        />
      </div>
      <Credits credits={credits} />
    </SceneFrame>
  );
};
