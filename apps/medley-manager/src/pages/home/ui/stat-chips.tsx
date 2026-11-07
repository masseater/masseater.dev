import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { statsQuery } from "#/pages/home/api/loader";

const ALL = {};

const CHIP =
  "rounded-full border bg-background/70 px-4 py-1.5 text-sm font-bold backdrop-blur transition-colors hover:border-primary";

const StatChips = (): ReactNode => {
  const { data: stats } = useSuspenseQuery(statsQuery);
  return (
    <div className="flex flex-wrap justify-center gap-2">
      <Link to="/videos" search={ALL} className={CHIP}>
        {`動画 ${stats.videos.toString()}`}
      </Link>
      <Link to="/songs" search={ALL} className={CHIP}>
        {`曲 ${stats.songs.toString()}`}
      </Link>
      <span className={CHIP}>{`パート ${stats.parts.toString()}`}</span>
      <Link to="/people" search={ALL} className={CHIP}>
        {`担当者 ${stats.people.toString()}`}
      </Link>
    </div>
  );
};

export { StatChips };
