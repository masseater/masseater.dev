import { Array, pipe } from "effect";
import type { ReactNode } from "react";

import { categoryMeta, EntryList } from "#/entities/entry";
import type { Category, Entry } from "#/entities/entry";

import { CollectionHeader } from "./collection-header";
import { IdeaList } from "./idea-list";

const CollectionView = ({
  category,
  entries,
}: Readonly<{ category: Category; entries: readonly Entry[] }>): ReactNode => {
  const listed = pipe(
    entries,
    Array.filter(({ status }) => status !== "idea"),
  );
  const ideas = pipe(
    entries,
    Array.filter(({ status }) => status === "idea"),
  );
  const { layout, title } = categoryMeta[category];
  return (
    <div className="flex flex-col gap-16">
      <div className="flex flex-col gap-10">
        <CollectionHeader count={listed.length} title={title} />
        <EntryList entries={listed} layout={layout} />
      </div>
      {Array.isReadonlyArrayNonEmpty(ideas) && <IdeaList ideas={ideas} layout={layout} />}
    </div>
  );
};

export { CollectionView };
