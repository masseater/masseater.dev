import { useSuspenseQuery } from "@tanstack/react-query";
import { Array, pipe } from "effect";
import type { ReactNode } from "react";

import { SongLink } from "#/entities/catalog";
import { songsQuery } from "#/pages/home/api/loader";
import { rankOf } from "#/pages/home/lib/rank";

import { RankingItem } from "./ranking-item";

const RANKING_LIMIT = 10;

const usesLabel = (count: number): string => `${count.toString()} 本`;

const SongRankingList = (): ReactNode => {
  const { data: songs } = useSuspenseQuery(songsQuery);
  return (
    <ol className="flex flex-col divide-y">
      {pipe(
        songs,
        Array.take(RANKING_LIMIT),
        Array.map((song, index) => (
          <RankingItem key={song.id} rank={rankOf(index)} value={usesLabel(song.useCount)}>
            <SongLink id={song.id} title={song.title} />
          </RankingItem>
        )),
      )}
    </ol>
  );
};

export { SongRankingList };
