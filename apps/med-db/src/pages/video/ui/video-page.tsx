import type { ReactNode } from "react";

import { PageSections } from "#/shared/ui/page-sections.tsx";

import { QuotedBy } from "./quoted-by.tsx";
import { VideoHeader } from "./video-header.tsx";
import { VideoParts } from "./video-parts.tsx";

export const VideoPage = (): ReactNode => (
  <PageSections>
    <VideoHeader />
    <VideoParts />
    <QuotedBy />
  </PageSections>
);
