import type { ReactNode } from "react";

import { useVideo } from "#/pages/video/api/use-video.ts";
import { SectionHeading } from "#/shared/ui/section-heading.tsx";

import { VideoSetlist } from "./video-setlist";

export const VideoParts = (): ReactNode => {
  const video = useVideo();
  return (
    <section className="flex flex-col gap-4">
      <SectionHeading title="セトリ" count={video.parts.length} />
      <VideoSetlist />
    </section>
  );
};
