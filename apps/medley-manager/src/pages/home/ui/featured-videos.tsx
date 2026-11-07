import { useSuspenseQuery } from "@tanstack/react-query";
import { Array as Arr, Number, Order, pipe } from "effect";
import { useMemo } from "react";
import type { ReactNode } from "react";

import { VideoList } from "#/entities/catalog";
import { videosQuery } from "#/pages/home/api/loader";
import { SectionHeading } from "#/shared/ui/section-heading";

const FEATURED_LIMIT = 8;
const NO_PARTS = 0;

type Counted = Readonly<{ partCount: number }>;

const byPartCount = Order.flip(Order.mapInput(Number.Order, (video: Counted) => video.partCount));

const partCount = ({ partCount: count }: Counted): string => `${count.toString()} パート`;

const FeaturedVideos = (): ReactNode => {
  const { data } = useSuspenseQuery(videosQuery);
  const videos = useMemo(
    () =>
      pipe(
        data,
        Arr.filter((video) => video.partCount > NO_PARTS),
        (found) => Arr.sort(found, byPartCount),
        Arr.take(FEATURED_LIMIT),
      ),
    [data],
  );
  return (
    <section className="flex flex-col gap-4">
      <SectionHeading title="セトリが見られるメドレー" />
      <VideoList videos={videos} describe={partCount} />
    </section>
  );
};

export { FeaturedVideos };
