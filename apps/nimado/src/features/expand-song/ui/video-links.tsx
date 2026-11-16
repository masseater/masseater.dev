import type { Video } from "@masseater.dev/nimado";
import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { views } from "#/entities/ranking/index.ts";
import { ExternalLink } from "#/shared/ui/external-link.tsx";

export const VideoLinks = ({
  label,
  base,
  videos,
}: Readonly<{
  label: string;
  base: string;
  videos: readonly (typeof Video.Type)[];
}>): ReactNode => (
  <ul className="flex flex-col gap-1">
    {pipe(
      videos,
      Arr.map((video) => (
        <li key={video.id} className="flex gap-2">
          <ExternalLink href={`${base}${video.id}`} text={`${label} ${video.id}`} />
          <span className="text-muted-foreground tabular-nums">{views(video.views)}</span>
        </li>
      )),
    )}
  </ul>
);
