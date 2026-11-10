import { useSuspenseQuery } from "@tanstack/react-query";
import { Array, pipe } from "effect";
import type { ReactNode } from "react";

import { PersonLink } from "#/entities/catalog";
import { peopleQuery } from "#/pages/home/api/loader";
import { RANKING_LIMIT, rankOf } from "#/pages/home/lib/rank";

import { RankingItem } from "./ranking-item";

const creditsLabel = (count: number): string => `${count.toString()} パート`;

const PeopleRankingList = (): ReactNode => {
  const { data: people } = useSuspenseQuery(peopleQuery);
  return (
    <ol className="flex flex-col divide-y">
      {pipe(
        people,
        Array.take(RANKING_LIMIT),
        Array.map((person, index) => (
          <RankingItem
            key={person.id}
            rank={rankOf(index)}
            value={creditsLabel(person.creditCount)}
          >
            <PersonLink id={person.id} name={person.name} />
          </RankingItem>
        )),
      )}
    </ol>
  );
};

export { PeopleRankingList };
