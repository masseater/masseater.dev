import type { ReactNode } from "react";
import { useCurrentFrame } from "remotion";

import type { Line, Segment } from "#/entities/script/index.ts";
import { plainOf } from "#/entities/script/index.ts";
import { FIT, NOTHING } from "#/shared/config/index.ts";
import { fitSize, innerWidth } from "#/shared/ui/fit.ts";
import { markProgress, slamIn } from "#/shared/ui/motion.ts";

import { Headline } from "./headline.tsx";
import { MetaTags } from "./meta-tags.tsx";
import { SceneFrame } from "./scene-frame.tsx";
import type { SceneProps } from "./scene-props.ts";

const MARK_AT = 4;

export const TitleScene = ({
  timed,
  format,
  title,
  items,
}: Readonly<SceneProps & { title: readonly Segment[]; items: readonly Line[] }>): ReactNode => {
  const frame = useCurrentFrame();
  const size = fitSize({
    text: plainOf(title),
    width: innerWidth(format),
    max: FIT[format].name,
    face: "impact",
  });
  return (
    <SceneFrame caption timed={timed} whip={false}>
      <div className="flex flex-1 flex-col items-center justify-center gap-10">
        <Headline
          mark={markProgress({ frame, at: MARK_AT })}
          motion={slamIn({ frame, at: NOTHING })}
          segments={title}
          size={size}
        />
        <MetaTags frame={frame} items={items} reveals={timed.reveals} />
      </div>
    </SceneFrame>
  );
};
