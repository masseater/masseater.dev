import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import type { SongView } from "#/entities/song/index.ts";

import { SectionMarks } from "./section-marks.tsx";
import { TrackLane } from "./track-lane.tsx";

export const Timeline = ({ view }: Readonly<{ view: SongView }>): ReactNode => (
  <div className="grid gap-1">
    <SectionMarks sections={view.sections} />
    {pipe(
      view.lanes,
      Arr.map((lane) => <TrackLane key={lane.track} lane={lane} />),
    )}
  </div>
);
