import type { ReactNode } from "react";

import { SongVideos } from "./song-videos";

const NICO_COLUMNS = 2;
const YOUTUBE_COLUMNS = 2;

const spanOf = (youtube: boolean): number => {
  if (youtube) {
    return NICO_COLUMNS + YOUTUBE_COLUMNS;
  }
  return NICO_COLUMNS;
};

const VideoRow = ({ id, youtube }: Readonly<{ id: number; youtube: boolean }>): ReactNode => (
  <tr className="border-b">
    <td aria-hidden />
    <td colSpan={spanOf(youtube)} className="pb-3">
      <SongVideos id={id} />
    </td>
  </tr>
);

export { VideoRow };
