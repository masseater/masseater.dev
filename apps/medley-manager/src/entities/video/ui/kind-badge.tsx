import type { ReactNode } from "react";

import { VIDEO_KIND_LABEL } from "#/entities/video/lib/video-kind.ts";
import type { VideoKind } from "#/entities/video/lib/video-kind.ts";
import { Badge } from "#/shared/ui/badge.tsx";

const KIND_VARIANT = {
  medley: "pink",
  collab: "cyan",
  single: "green",
  other: "secondary",
} as const satisfies Readonly<Record<VideoKind, string>>;

export const KindBadge = ({ kind }: Readonly<{ kind: VideoKind }>): ReactNode => (
  <Badge variant={KIND_VARIANT[kind]}>{VIDEO_KIND_LABEL[kind]}</Badge>
);
