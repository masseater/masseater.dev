import { Array, pipe } from "effect";
import type { ReactNode } from "react";

import { VideoListItem } from "./video-list-item";
import type { VideoSummary } from "./video-list-item";

const VideoList = <Item extends VideoSummary>({
  videos,
  describe,
}: Readonly<{ videos: readonly Item[]; describe: (item: Item) => string }>): ReactNode => (
  <ul className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
    {pipe(
      videos,
      Array.map((item) => <VideoListItem key={item.id} video={item} detail={describe(item)} />),
    )}
  </ul>
);

export { VideoList };
