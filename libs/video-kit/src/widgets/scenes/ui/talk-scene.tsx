import type { ReactNode } from "react";
import { useCurrentFrame } from "remotion";

import type { Segment } from "#/entities/script/index.ts";
import { HEADING_LANDS_AT } from "#/entities/timeline/index.ts";
import { markProgress, slamIn } from "#/shared/ui/motion.ts";
import { headlineSize } from "#/widgets/scenes/model/headline-size.ts";

import { Headline } from "./headline.tsx";
import { SceneFrame } from "./scene-frame.tsx";
import type { SceneProps } from "./scene-props.ts";

const LEAD = 3;
const MARK_DELAY = 2;

export const TalkScene = ({
  timed,
  format,
  heading,
}: Readonly<SceneProps & { heading: readonly Segment[] }>): ReactNode => {
  const frame = useCurrentFrame();
  const size = headlineSize({ segments: heading, format, slot: "heading" });
  return (
    <SceneFrame caption timed={timed} whip>
      <div className="flex flex-1 items-center justify-center">
        <Headline
          mark={markProgress({ frame, at: HEADING_LANDS_AT + MARK_DELAY })}
          motion={slamIn({ frame, at: HEADING_LANDS_AT - LEAD })}
          segments={heading}
          size={size}
        />
      </div>
    </SceneFrame>
  );
};
