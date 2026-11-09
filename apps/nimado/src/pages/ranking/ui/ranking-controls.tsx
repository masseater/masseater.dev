import type { ReactNode } from "react";

import { PERIOD_LABELS, SORT_LABELS, TEXT } from "#/pages/ranking/model/labels";
import { usePick, useRankingSearch, useUpdateSearch } from "#/pages/ranking/model/update";

import { ChoiceGroup } from "./choice-group";
import { CustomPeriod } from "./custom-period";
import { KindAndSearch } from "./kind-and-search";

const RankingControls = ({ dates }: Readonly<{ dates: readonly string[] }>): ReactNode => {
  const search = useRankingSearch();
  const update = useUpdateSearch();
  const pickSort = usePick({ update, key: "sort" });
  const pickPeriod = usePick({ update, key: "period" });
  return (
    <div className="flex flex-col gap-3">
      <ChoiceGroup label={TEXT.sort} labels={SORT_LABELS} value={search.sort} onChoose={pickSort} />
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

export { RankingControls };
