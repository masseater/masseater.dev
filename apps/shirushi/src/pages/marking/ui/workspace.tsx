import type { Media } from "@masseater.dev/media-notes-protocol";
import type { Array as Arr } from "effect";
import { useMemo } from "react";
import type { ReactNode } from "react";

import { MarkForm } from "#/features/mark-range/index.ts";
import { ForecastScore } from "#/features/reveal-forecast/index.ts";

import { SongMarks } from "./song-marks.tsx";
import { SongStage } from "./song-stage.tsx";
import { TasteTabs } from "./taste-tabs.tsx";
import type { Tab } from "./taste-tabs.tsx";
import { useTasteTabs } from "./use-taste-tabs.tsx";

const NO_WAITING = 0;

export const Workspace = ({ media }: Readonly<{ media: Media }>): ReactNode => {
  const [pairs, statements] = useTasteTabs();
  const tabs = useMemo(
    (): Arr.NonEmptyReadonlyArray<Tab> => [
      {
        id: "marks",
        label: "しるし",
        waiting: NO_WAITING,
        panel: (
          <div className="grid gap-4">
            <MarkForm />
            <ForecastScore media={media} />
            <SongMarks media={media} />
          </div>
        ),
      },
      pairs,
      statements,
    ],
    [media, pairs, statements],
  );
  return (
    <div className="grid items-start gap-6 lg:grid-cols-3">
      <SongStage media={media} />
      <aside className="lg:sticky lg:top-4">
        <TasteTabs tabs={tabs} />
      </aside>
    </div>
  );
};
