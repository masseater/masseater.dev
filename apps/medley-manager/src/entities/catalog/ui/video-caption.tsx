import type { ReactNode } from "react";

import type { VideoKind } from "#/entities/catalog/lib/video-kind";

import { KindBadge } from "./kind-badge";

const VideoCaption = ({
  video,
  detail,
}: Readonly<{
  video: Readonly<{ title: string; kind: VideoKind }>;
  detail: string;
}>): ReactNode => (
  <span className="flex flex-col gap-1">
    <span className="group-hover:text-primary line-clamp-2 font-bold">{video.title}</span>
    <span className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
      <KindBadge kind={video.kind} />
      {detail}
    </span>
  </span>
);

export { VideoCaption };
