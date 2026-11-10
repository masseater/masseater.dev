import { shardOf } from "@masseater.dev/nimado";
import { useQuery } from "@tanstack/react-query";
import { Array as Arr, Option, pipe } from "effect";
import type { ReactNode } from "react";

import { TEXT } from "#/pages/ranking/model/labels";
import { shardQuery } from "#/shared/api";
import { NICO_WATCH_URL, VOCADB_SONG_URL, YOUTUBE_WATCH_URL } from "#/shared/config";
import { ExternalLink } from "#/shared/ui/external-link";

import { VideoLinks } from "./video-links";

const SongVideos = ({ id }: Readonly<{ id: number }>): ReactNode => {
  const query = useQuery(shardQuery(shardOf(id)));
  const song = pipe(
    Option.fromNullishOr(query.data),
    Option.flatMap(Arr.findFirst((detail) => detail.id === id)),
  );
  return (
    <div className="flex flex-col gap-2 text-xs">
      {Option.isSome(song) && (
        <VideoLinks label={TEXT.nico} base={NICO_WATCH_URL} videos={song.value.nico} />
      )}
      {Option.isSome(song) && (
        <VideoLinks label={TEXT.youtube} base={YOUTUBE_WATCH_URL} videos={song.value.youtube} />
      )}
      <ExternalLink href={`${VOCADB_SONG_URL}${id.toString()}`} text={TEXT.vocadb} />
    </div>
  );
};

export { SongVideos };
