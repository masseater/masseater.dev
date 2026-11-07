import type { ReactNode } from "react";

import { VIDEO_KIND_LABEL } from "#/entities/catalog/lib/video-kind";
import type { VideoKind } from "#/entities/catalog/lib/video-kind";
import { Badge } from "#/shared/ui/badge";

const KIND_VARIANT = {
  medley: "pink",
  collab: "cyan",
  single: "green",
  other: "secondary",
} as const satisfies Readonly<Record<VideoKind, string>>;

const KindBadge = ({ kind }: Readonly<{ kind: VideoKind }>): ReactNode => (
  <Badge variant={KIND_VARIANT[kind]}>{VIDEO_KIND_LABEL[kind]}</Badge>
);

export { KindBadge };
