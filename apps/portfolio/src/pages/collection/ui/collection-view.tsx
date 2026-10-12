import type { ReactNode } from "react";

import { categoryMeta, EntryList } from "#/entities/entry";
import type { Category, Entry } from "#/entities/entry";

const CollectionView = ({
  category,
  entries,
}: Readonly<{ category: Category; entries: readonly Entry[] }>): ReactNode => (
  <div>
    <h1 className="sr-only">{categoryMeta[category].title}</h1>
    <EntryList columns={categoryMeta[category].columns} entries={entries} />
  </div>
);

export { CollectionView };
