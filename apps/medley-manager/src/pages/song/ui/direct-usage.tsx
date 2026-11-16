import type { ReactNode } from "react";

import { VideoList } from "#/entities/video/index.ts";
import { useSong } from "#/pages/song/api/use-song.ts";
import { describeDirect } from "#/pages/song/lib/describe.ts";
import { SectionHeading } from "#/shared/ui/section-heading.tsx";

export const DirectUsage = (): ReactNode => {
  const { direct } = useSong();
  return (
    <section className="flex flex-col gap-4">
      <SectionHeading title="この曲が使われた動画" count={direct.length} />
      <VideoList videos={direct} describe={describeDirect} />
    </section>
  );
};
