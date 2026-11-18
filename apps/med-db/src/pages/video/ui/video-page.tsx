import type { ReactNode } from "react";

import { QuotedBy } from "./quoted-by.tsx";
import { VideoHeader } from "./video-header.tsx";
import { VideoParts } from "./video-parts.tsx";

export const VideoPage = (): ReactNode => (
  <div className="flex flex-col gap-10">
    <VideoHeader />
    <VideoParts />
    <QuotedBy />
  </div>
);
