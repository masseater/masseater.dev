import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { Array, pipe } from "effect";
import type { ReactNode } from "react";

import { VideoList, catalogQueries } from "#/entities/catalog";

const route = getRouteApi("/videos/");

const describe = ({
  uploader,
  partCount,
}: Readonly<{ uploader: string | null; partCount: number }>): string =>
  pipe([uploader ?? "", `${partCount.toString()} パート`], Array.filter(Boolean), Array.join("・"));

const VideoResults = (): ReactNode => {
  const filter = route.useSearch();
  const { data: videos } = useSuspenseQuery(catalogQueries.videos.get.queryOptions(filter));
  return <VideoList videos={videos} describe={describe} />;
};

export { VideoResults };
