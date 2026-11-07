import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import type { ReactNode } from "react";

import type { VideoKind } from "#/entities/catalog/lib/video-kind";

import { VideoCaption } from "./video-caption";
import { VideoThumbnail } from "./video-thumbnail";

type VideoSummary = Readonly<{
  id: number;
  title: string;
  kind: VideoKind;
  thumbnailUrl: string | null;
}>;

const VideoListItem = ({
  video,
  detail,
}: Readonly<{ video: VideoSummary; detail: string }>): ReactNode => {
  const params = useMemo(() => ({ id: video.id }), [video.id]);
  return (
    <li>
      <Link to="/videos/$id" params={params} className="group flex flex-col gap-2">
        <VideoThumbnail src={video.thumbnailUrl} />
        <VideoCaption video={video} detail={detail} />
      </Link>
    </li>
  );
};

export type { VideoSummary };
export { VideoListItem };
