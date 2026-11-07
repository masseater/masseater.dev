import type { ReactNode } from "react";

import { FeaturedVideos } from "./featured-videos";
import { Hero } from "./hero";
import { PeopleRanking } from "./people-ranking";
import { SongRanking } from "./song-ranking";

const HomePage = (): ReactNode => (
  <div className="flex flex-col gap-12">
    <Hero />
    <FeaturedVideos />
    <div className="grid gap-6 md:grid-cols-2">
      <SongRanking />
      <PeopleRanking />
    </div>
  </div>
);

export { HomePage };
