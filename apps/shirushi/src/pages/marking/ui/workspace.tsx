import type { Media } from "@masseater.dev/media-notes-protocol";
import type { ReactNode } from "react";

import { MarkForm } from "#/features/mark-range/index.ts";

import { SongMarks } from "./song-marks.tsx";
import { SongStage } from "./song-stage.tsx";

export const Workspace = ({ media }: Readonly<{ media: Media }>): ReactNode => (
  <div className="grid items-start gap-6 lg:grid-cols-3">
    <SongStage media={media} />
    <aside className="grid gap-4 lg:sticky lg:top-4">
      <MarkForm />
      <SongMarks media={media} />
    </aside>
  </div>
);
