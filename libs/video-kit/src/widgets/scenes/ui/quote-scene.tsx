import { Option } from "effect";
import type { ReactNode } from "react";
import { useCurrentFrame } from "remotion";

import { ONE } from "#/shared/config/index.ts";
import { Box } from "#/shared/ui/box.tsx";
import { popUp, slamIn } from "#/shared/ui/motion.ts";

import { SceneFrame } from "./scene-frame.tsx";
import type { SceneProps } from "./scene-props.ts";

const SOURCE_AT = 6;
const NO_SOURCE = "";

export const QuoteScene = ({
  timed,
  text,
  source,
}: Readonly<SceneProps & { text: string; source: Option.Option<string> }>): ReactNode => {
  const frame = useCurrentFrame();
  return (
    <SceneFrame caption timed={timed} whip>
      <div className="flex flex-1 flex-col justify-center gap-8">
        <Box
          className="motion border-accent font-impact text-quote text-ink japanese horizontal:text-quote-h border-l-12 pl-10 leading-snug whitespace-pre-line"
          vars={slamIn({ frame, at: ONE })}
        >
          {text}
        </Box>
        <Box
          className="motion font-text text-meta text-muted horizontal:text-meta-h self-end"
          vars={popUp({ frame, at: SOURCE_AT })}
        >
          {Option.match(source, { onNone: () => NO_SOURCE, onSome: (name) => `— ${name}` })}
        </Box>
      </div>
    </SceneFrame>
  );
};
