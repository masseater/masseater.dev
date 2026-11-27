import { Thumbnail } from "@remotion/player";
import { Array as Arr, Effect, pipe } from "effect";
import type { Scope } from "effect";
import type { CSSProperties, ReactNode } from "react";
import { useMemo } from "react";
import { createRoot } from "react-dom/client";

import type { Timeline } from "#/entities/cut/index.ts";
import type { Format } from "#/shared/config/index.ts";
import { CutVideo } from "#/widgets/video/index.ts";

import { SAMPLE_DRAW } from "./sample.test.support.tsx";

import styles from "./video.css?inline";

const SHOWN_AT = 0.7;
const SCALE: Readonly<Record<Format, number>> = { vertical: 0.16, horizontal: 0.09 };

const sizeOf = ({ width, height, format }: Timeline): CSSProperties => ({
  width: width * SCALE[format],
  height: height * SCALE[format],
});

const Sheet = ({ timeline }: Readonly<{ timeline: Timeline }>): ReactNode => {
  const inputProps = useMemo(() => ({ timeline, draw: SAMPLE_DRAW }), [timeline]);
  const fit = useMemo(() => sizeOf(timeline), [timeline]);
  return (
    <main className="flex items-start gap-2">
      {pipe(
        timeline.cuts,
        Arr.map(({ id, from, duration }) => (
          <Thumbnail
            component={CutVideo}
            compositionHeight={timeline.height}
            compositionWidth={timeline.width}
            durationInFrames={timeline.durationInFrames}
            fps={timeline.fps}
            frameToDisplay={from + Math.floor(duration * SHOWN_AT)}
            inputProps={inputProps}
            key={id}
            style={fit}
          />
        )),
      )}
    </main>
  );
};

export const mountSheet = (timeline: Timeline): Effect.Effect<void, never, Scope.Scope> =>
  Effect.acquireRelease(
    Effect.sync(() => {
      const style = document.createElement("style");
      style.textContent = styles;
      document.head.append(style);
      const container = document.createElement("div");
      document.body.append(container);
      const root = createRoot(container);
      root.render(<Sheet timeline={timeline} />);
      return { style, container, root };
    }),
    ({ style, container, root }) =>
      Effect.sync(() => {
        root.unmount();
        container.remove();
        style.remove();
      }),
  );
