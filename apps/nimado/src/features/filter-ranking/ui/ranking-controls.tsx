import type { ReactNode } from "react";

import {
  PERIOD_LABELS,
  SORT_LABELS,
  TEXT,
  usePick,
  useRankingSearch,
  useUpdateSearch,
} from "#/entities/ranking/index.ts";
import { ChoiceGroup } from "#/shared/ui/choice-group.tsx";

import { CustomPeriod } from "./custom-period";
import { KindAndSearch } from "./kind-and-search";

export const RankingControls = ({
  dates,
  youtube,
}: Readonly<{ dates: readonly string[]; youtube: boolean }>): ReactNode => {
  const search = useRankingSearch();
  const update = useUpdateSearch();
  const pickSort = usePick({ update, key: "sort" });
  const pickPeriod = usePick({ update, key: "period" });
  return (
    <div className="flex flex-col gap-3">
      {youtube && (
        <ChoiceGroup
          label={TEXT.sort}
          labels={SORT_LABELS}
          value={search.sort}
          onChoose={pickSort}
        />
      )}
      <ChoiceGroup
        label={TEXT.period}
        labels={PERIOD_LABELS}
        value={search.period}
        onChoose={pickPeriod}
      />
      {search.period === "custom" && <CustomPeriod dates={dates} search={search} update={update} />}
      <KindAndSearch search={search} update={update} />
    </div>
  );
};
