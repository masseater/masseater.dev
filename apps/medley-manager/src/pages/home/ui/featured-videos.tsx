import { useSuspenseQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { VideoList } from "#/entities/catalog";
import { videosQuery } from "#/pages/home/api/loader";
import { SectionHeading } from "#/shared/ui/section-heading";

type Counted = Readonly<{ partCount: number }>;

const partCount = ({ partCount: count }: Counted): string => `${count.toString()} パート`;

const FeaturedVideos = (): ReactNode => {
  const { data: videos } = useSuspenseQuery(videosQuery);
  return (
    <section className="flex flex-col gap-4">
      <SectionHeading title="セトリが見られるメドレー" />
      <VideoList videos={videos} describe={partCount} />
    </section>
  );
};

export { FeaturedVideos };
