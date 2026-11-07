import { Array as Arr } from "effect";
import type { ReactNode } from "react";

import { VideoList } from "#/entities/catalog";
import { useVideo } from "#/pages/video/api/use-video";
import { SectionHeading } from "#/shared/ui/section-heading";

const nothing = (): string => "";

const QuotedBy = (): ReactNode => {
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

export { QuotedBy };
