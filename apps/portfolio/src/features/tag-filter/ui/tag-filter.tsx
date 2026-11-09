import { Array, Option, pipe } from "effect";
import type { ReactNode } from "react";

import { allTags } from "#/features/tag-filter/model/search";
import type { TagSearch } from "#/features/tag-filter/model/search";
import type { TagCount } from "#/features/tag-filter/model/tag-filter";

import { TagFilterButton } from "./tag-filter-button";

const LABEL = "タグで絞り込む";

const ALL_LABEL = "すべて";

const TagFilter = ({
  activeTag,
  counts,
  onSelect,
}: Readonly<{
  activeTag: Option.Option<string>;
  counts: readonly TagCount[];
  onSelect: (search: TagSearch) => void;
}>): ReactNode => (
  <ul
    aria-label={LABEL}
    className="text-foreground/50 font-display xl:below-site-header-gap -mx-4 flex scrollbar-none gap-2 overflow-x-auto mask-r-from-85% px-4 py-1 text-xs xl:sticky xl:col-start-3 xl:row-start-1 xl:mx-0 xl:min-w-0 xl:flex-col xl:items-end xl:overflow-visible xl:mask-none xl:px-0"
  >
    <TagFilterButton active={Option.isNone(activeTag)} onSelect={onSelect} search={allTags}>
      {ALL_LABEL}
    </TagFilterButton>
    {pipe(
      counts,
      Array.map(({ tag, count, search }) => (
        <TagFilterButton
          active={Option.contains(activeTag, tag)}
          key={tag}
          onSelect={onSelect}
          search={search}
        >
          {`${tag} (${String(count)})`}
        </TagFilterButton>
      )),
    )}
  </ul>
);

export { TagFilter };
