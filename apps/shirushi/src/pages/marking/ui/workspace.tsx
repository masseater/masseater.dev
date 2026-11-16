import type { ReactNode } from "react";

import { MarkForm } from "#/features/mark-range/index.ts";
import type { Song } from "#protocol";

import { SongMarks } from "./song-marks.tsx";
import { SongStage } from "./song-stage.tsx";

export const Workspace = ({ song }: Readonly<{ song: Song }>): ReactNode => (
  <div className="grid items-start gap-6 lg:grid-cols-3">
    <SongStage song={song} />
    <aside className="grid gap-4 lg:sticky lg:top-4">
      <MarkForm />
      <SongMarks />
    </aside>
  </div>
);
