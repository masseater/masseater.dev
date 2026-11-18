import type { ReactNode } from "react";

import { DirectUsage } from "./direct-usage.tsx";
import { IndirectUsage } from "./indirect-usage.tsx";
import { SongHeader } from "./song-header.tsx";

export const SongPage = (): ReactNode => (
  <div className="flex flex-col gap-10">
    <SongHeader />
    <DirectUsage />
    <IndirectUsage />
  </div>
);
