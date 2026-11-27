import type { ReactNode } from "react";

import { PageSections } from "#/shared/ui/page-sections.tsx";

import { DirectUsage } from "./direct-usage.tsx";
import { IndirectUsage } from "./indirect-usage.tsx";
import { SongHeader } from "./song-header.tsx";

export const SongPage = (): ReactNode => (
  <PageSections>
    <SongHeader />
    <DirectUsage />
    <IndirectUsage />
  </PageSections>
);
