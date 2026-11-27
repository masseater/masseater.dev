import { StandardVideo } from "@masseater.dev/video-kit";
import { Array as Arr, Option } from "effect";
import type { ReactNode } from "react";

import type { VideoProps } from "./metadata.ts";
import { overridesOf } from "./sources.ts";

const NOTHING_YET = "";

export const Video = ({ slug, timelines }: VideoProps): ReactNode =>
  Option.match(Arr.head(timelines), {
    onNone: () => NOTHING_YET,
    onSome: (timeline) => <StandardVideo overrides={overridesOf(slug)} timeline={timeline} />,
  });
