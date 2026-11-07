import { Option } from "effect";
import type { ReactNode } from "react";

import { VideoThumbnail, embedUrl } from "#/entities/catalog";

type Playable = Readonly<{
  title: string;
  videoId: string | null;
  url: string;
  thumbnailUrl: string | null;
}>;

const VideoPlayer = ({ video }: Readonly<{ video: Playable }>): ReactNode =>
  Option.match(embedUrl(video), {
    onNone: () => <VideoThumbnail src={video.thumbnailUrl} />,
    onSome: (src) => (
      <iframe
        src={src}
        title={`${video.title} の動画プレイヤー`}
        allow="autoplay; fullscreen; picture-in-picture"
        sandbox="allow-scripts allow-popups allow-presentation"
        loading="lazy"
        className="bg-screen aspect-video w-full rounded-lg"
      />
    ),
  });

export { VideoPlayer };
