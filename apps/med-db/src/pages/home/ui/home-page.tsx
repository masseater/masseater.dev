import type { ReactNode } from "react";

import { FeaturedVideos } from "./featured-videos.tsx";
import { Hero } from "./hero.tsx";
import { PeopleRanking } from "./people-ranking.tsx";
import { SongRanking } from "./song-ranking.tsx";

export const HomePage = (): ReactNode => (
  <div className="flex flex-col gap-12">
    <Hero />
    <FeaturedVideos />
    <div className="grid gap-6 md:grid-cols-2">
      <SongRanking />
      <PeopleRanking />
    </div>
  </div>
);
