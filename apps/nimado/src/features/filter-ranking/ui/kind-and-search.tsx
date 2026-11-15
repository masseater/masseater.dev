import type { ReactNode } from "react";

import { KIND_LABELS, TEXT, usePick } from "#/entities/ranking/index.ts";
import type { RankingSearch, Update } from "#/entities/ranking/index.ts";
import { ChoiceGroup } from "#/shared/ui/choice-group.tsx";

import { SongSearch } from "./song-search";

export const KindAndSearch = ({
  search,
  update,
}: Readonly<{ search: RankingSearch; update: Update }>): ReactNode => {
  const pickKind = usePick({ update, key: "kind" });
  const pickQuery = usePick({ update, key: "query" });
  return (
    <div className="flex flex-wrap items-center gap-3">
      <ChoiceGroup label={TEXT.kind} labels={KIND_LABELS} value={search.kind} onChoose={pickKind} />
      <SongSearch query={search.query} onChange={pickQuery} />
    </div>
  );
};
