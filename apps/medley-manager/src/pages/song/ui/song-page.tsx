import type { ReactNode } from "react";

import { DirectUsage } from "./direct-usage";
import { IndirectUsage } from "./indirect-usage";
import { SongHeader } from "./song-header";

export const SongPage = (): ReactNode => (
  <div className="flex flex-col gap-10">
    <SongHeader />
    <DirectUsage />
    <IndirectUsage />
  </div>
);
