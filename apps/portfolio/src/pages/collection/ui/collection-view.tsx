import type { ReactNode } from "react";

import { categoryMeta, EntryList } from "#/entities/entry";
import type { Category, Entry } from "#/entities/entry";

const CollectionView = ({
  category,
  entries,
}: Readonly<{ category: Category; entries: readonly Entry[] }>): ReactNode => (
  <div className="flex flex-col gap-6">
    <header className="flex flex-col gap-2">
      <h1 className="sr-only">{categoryMeta[category].title}</h1>
      <p className="text-foreground/70 text-center">{categoryMeta[category].description}</p>
    </header>
    <EntryList entries={entries} />
  </div>
);

export { CollectionView };
