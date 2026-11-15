import type { ReactNode } from "react";

import { ThumbnailImage } from "./thumbnail-image";

const VideoThumbnail = ({ src }: Readonly<{ src: string | null }>): ReactNode => (
  <span className="bg-screen text-muted-foreground flex aspect-video items-center justify-center overflow-hidden rounded-lg text-2xl">
    <ThumbnailImage src={src} />
  </span>
);

export { VideoThumbnail };
