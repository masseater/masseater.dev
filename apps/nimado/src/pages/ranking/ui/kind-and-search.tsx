import type { ReactNode } from "react";

import { KIND_LABELS, TEXT } from "#/pages/ranking/model/labels";
import type { RankingSearch } from "#/pages/ranking/model/search";
import { usePick } from "#/pages/ranking/model/update";
import type { Update } from "#/pages/ranking/model/update";

import { ChoiceGroup } from "./choice-group";
import { SongSearch } from "./song-search";

const KindAndSearch = ({
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

export { KindAndSearch };
