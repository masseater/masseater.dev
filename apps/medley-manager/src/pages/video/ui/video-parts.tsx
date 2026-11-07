import type { ReactNode } from "react";

import { useVideo } from "#/pages/video/api/use-video";
import { SectionHeading } from "#/shared/ui/section-heading";

import { VideoSetlist } from "./video-setlist";

const VideoParts = (): ReactNode => {
  const video = useVideo();
  return (
    <section className="flex flex-col gap-4">
      <SectionHeading title="セトリ" count={video.parts.length} />
      <VideoSetlist />
    </section>
  );
};

export { VideoParts };
