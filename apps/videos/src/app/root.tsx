import { FORMATS, FPS, FRAMES } from "@masseater.dev/video-kit/script";
import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";
import { useMemo } from "react";
import { Composition, Folder } from "remotion";

import { metadataFor } from "./metadata.ts";
import type { VideoProps } from "./metadata.ts";
import { videoSources } from "./sources.ts";
import type { VideoSource } from "./sources.ts";
import { Video } from "./video.tsx";

const PLACEHOLDER_FRAMES = 1;

const VideoFolder = ({ slug, script }: VideoSource): ReactNode => {
  const defaultProps = useMemo((): VideoProps => ({ slug, timelines: [] }), [slug]);
  return (
    <Folder name={slug}>
      {pipe(
        FORMATS,
        Arr.filter((format) => script.formats.includes(format)),
        Arr.map((format) => (
          <Composition
            calculateMetadata={metadataFor({ script, format })}
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
    Arr.map(({ slug, script }) => <VideoFolder key={slug} script={script} slug={slug} />),
  );
