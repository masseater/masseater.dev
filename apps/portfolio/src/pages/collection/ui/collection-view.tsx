import { Array, pipe } from "effect";
import type { Option } from "effect";
import type { ReactNode } from "react";

import { categoryMeta, EntryList } from "#/entities/entry";
import type { Category, Entry } from "#/entities/entry";
import { tagCounts, withTag } from "#/pages/collection/model/tag-filter";

import { IdeaList } from "./idea-list";
import { TagFilter } from "./tag-filter";

const CollectionView = ({
  activeTag,
  category,
  entries,
}: Readonly<{
  activeTag: Option.Option<string>;
  category: Category;
  entries: readonly Entry[];
}>): ReactNode => {
  const counts = tagCounts(entries);
  const shown = withTag(activeTag)(entries);
  const listed = pipe(
    shown,
    Array.filter(({ status }) => status !== "idea"),
  );
  const ideas = pipe(
    shown,
    Array.filter(({ status }) => status === "idea"),
  );
  const { layout, title } = categoryMeta[category];
  return (
    <div className="xl:collection-columns flex flex-col gap-8 xl:grid xl:items-start" data-wide>
      <h1 className="sr-only">{title}</h1>
      {Array.isReadonlyArrayNonEmpty(counts) && <TagFilter activeTag={activeTag} counts={counts} />}
      <div className="flex min-w-0 flex-col gap-16 xl:col-start-2 xl:row-start-1">
        <EntryList entries={listed} layout={layout} />
        {Array.isReadonlyArrayNonEmpty(ideas) && <IdeaList ideas={ideas} layout={layout} />}
      </div>
    </div>
  );
};

export { CollectionView };
