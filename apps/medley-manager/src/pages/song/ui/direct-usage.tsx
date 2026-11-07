import type { ReactNode } from "react";

import { VideoList } from "#/entities/catalog";
import { useSong } from "#/pages/song/api/use-song";
import { describeDirect } from "#/pages/song/lib/describe";
import { SectionHeading } from "#/shared/ui/section-heading";

const DirectUsage = (): ReactNode => {
  const { direct } = useSong();
  return (
    <section className="flex flex-col gap-4">
      <SectionHeading title="この曲が使われた動画" count={direct.length} />
      <VideoList videos={direct} describe={describeDirect} />
    </section>
  );
};

export { DirectUsage };
