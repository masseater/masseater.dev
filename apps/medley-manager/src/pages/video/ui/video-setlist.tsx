import { Array as Arr } from "effect";
import type { ReactNode } from "react";

import { Setlist } from "#/entities/catalog";
import { useVideo } from "#/pages/video/api/use-video";

const EMPTY = "この動画のセトリはまだ登録されていません。";

const VideoSetlist = (): ReactNode => {
  const video = useVideo();
  return Arr.match(video.parts, {
    onEmpty: () => (
      <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center">
        {EMPTY}
      </p>
    ),
    onNonEmpty: (parts) => <Setlist source={video} parts={parts} />,
  });
};

export { VideoSetlist };
