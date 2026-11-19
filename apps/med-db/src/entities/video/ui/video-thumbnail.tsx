import type { ReactNode } from "react";

import { ThumbnailImage } from "./thumbnail-image.tsx";
import type { ThumbnailPriority } from "./thumbnail-image.tsx";

export const VideoThumbnail = ({
  src,
  priority,
}: Readonly<{ src: string | null; priority: ThumbnailPriority }>): ReactNode => (
  <span className="bg-screen text-muted-foreground flex aspect-video items-center justify-center overflow-hidden rounded-lg text-2xl">
    <ThumbnailImage src={src} priority={priority} />
  </span>
);
