import { Array as Arr } from "effect";
import type { ReactNode } from "react";

import { VideoList } from "#/entities/video/index.ts";
import { useVideo } from "#/pages/video/api/use-video.ts";
import { SectionHeading } from "#/shared/ui/section-heading.tsx";

const nothing = (): string => "";

export const QuotedBy = (): ReactNode => {
  const video = useVideo();
  return (
    Arr.isReadonlyArrayNonEmpty(video.quotedBy) && (
      <section className="flex flex-col gap-4">
        <SectionHeading title="この動画を引用している動画" count={video.quotedBy.length} />
        <VideoList videos={video.quotedBy} describe={nothing} />
      </section>
    )
  );
};
