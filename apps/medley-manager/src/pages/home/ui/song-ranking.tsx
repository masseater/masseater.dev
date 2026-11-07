import type { ReactNode } from "react";

import { SectionHeading } from "#/shared/ui/section-heading";

import { SongRankingList } from "./song-ranking-list";

const SongRanking = (): ReactNode => (
  <section className="bg-card flex flex-col gap-4 rounded-xl border p-5">
    <SectionHeading title="よく使われる曲" />
    <SongRankingList />
  </section>
);

export { SongRanking };
