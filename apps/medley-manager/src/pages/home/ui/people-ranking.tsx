import type { ReactNode } from "react";

import { SectionHeading } from "#/shared/ui/section-heading.tsx";

import { PeopleRankingList } from "./people-ranking-list.tsx";

export const PeopleRanking = (): ReactNode => (
  <section className="bg-card flex flex-col gap-4 rounded-xl border p-5">
    <SectionHeading title="担当パートが多い人" />
    <PeopleRankingList />
  </section>
);
