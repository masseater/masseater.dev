import { FORMATS, FPS, FRAMES, parseScript } from "@masseater.dev/video-kit/script";
import type { Format } from "@masseater.dev/video-kit/script";
import { Array as Arr, Effect, Exit, pipe } from "effect";
import type { ReactNode } from "react";
import { useMemo } from "react";
import { Composition, Folder } from "remotion";

import { metadataFor } from "./metadata.ts";
import type { VideoProps } from "./metadata.ts";
import { videoSources } from "./sources.ts";
import type { VideoSource } from "./sources.ts";
import { Video } from "./video.tsx";

const PLACEHOLDER_FRAMES = 1;

const NO_FORMATS: readonly Format[] = [];

const formatsOf = (markdown: string): readonly Format[] =>
  Exit.match(Effect.runSyncExit(parseScript(markdown)), {
    onFailure: () => NO_FORMATS,
    onSuccess: ({ formats }) => formats,
  });

const VideoFolder = ({ slug, markdown }: VideoSource): ReactNode => {
  const defaultProps = useMemo((): VideoProps => ({ slug, timelines: [] }), [slug]);
  return (
    <Folder name={slug}>
      {pipe(
        FORMATS,
        Arr.filter((format) => formatsOf(markdown).includes(format)),
        Arr.map((format) => (
          <Composition
            calculateMetadata={metadataFor({ markdown, format })}
            component={Video}
            defaultProps={defaultProps}
            durationInFrames={PLACEHOLDER_FRAMES}
            fps={FPS}
            height={FRAMES[format].height}
            id={`${slug}-${format}`}
            key={format}
            width={FRAMES[format].width}
          />
        )),
      )}
    </Folder>
  );
};

export const Root = (): ReactNode =>
  pipe(
    videoSources(),
    Arr.map(({ slug, markdown }) => <VideoFolder key={slug} markdown={markdown} slug={slug} />),
  );
