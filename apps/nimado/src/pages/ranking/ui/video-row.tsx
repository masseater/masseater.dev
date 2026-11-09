import type { ReactNode } from "react";

import { SongVideos } from "./song-videos";

const SPAN = 4;

const VideoRow = ({ id }: Readonly<{ id: number }>): ReactNode => (
  <tr className="border-b">
    <td aria-hidden />
    <td colSpan={SPAN} className="pb-3">
      <SongVideos id={id} />
    </td>
  </tr>
);

export { VideoRow };
