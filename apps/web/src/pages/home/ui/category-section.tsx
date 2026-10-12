import { Link } from "@tanstack/react-router";
import { Array } from "effect";
import type { ReactNode } from "react";

import { EntryList } from "#/entities/entry";
import type { CategoryInfo, Entry } from "#/entities/entry";

const LATEST_COUNT = 3;
const MORE = "すべて見る";

const CategorySection = ({
  info,
  entries,
}: Readonly<{ info: CategoryInfo; entries: readonly Entry[] }>): ReactNode => (
  <section aria-labelledby={info.category} className="flex flex-col gap-2">
    <div className="flex items-baseline justify-between gap-4">
      <h2 className="font-display text-2xl font-bold" id={info.category}>
        {info.title}
      </h2>
      <Link
        className="text-muted-foreground hover:text-foreground focus-visible:text-foreground text-sm transition-colors"
        params={info}
        to="/$category"
      >
        {MORE}
      </Link>
    </div>
    <EntryList
      entries={Array.take(
        entries.filter((entry) => entry.category === info.category),
        LATEST_COUNT,
      )}
    />
  </section>
);

export { CategorySection };
