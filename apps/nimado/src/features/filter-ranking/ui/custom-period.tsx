import { Array as Arr, Order } from "effect";
import type { ReactNode } from "react";

import { TEXT, customRange, usePick } from "#/entities/ranking";
import type { RankingSearch, Update } from "#/entities/ranking";

import { DateSelect } from "./date-select";

const CustomPeriod = ({
  dates,
  search,
  update,
}: Readonly<{ dates: readonly string[]; search: RankingSearch; update: Update }>): ReactNode => {
  const pickFrom = usePick({ update, key: "from" });
  const pickTo = usePick({ update, key: "to" });
  const sorted = Arr.sort(dates, Order.flip(Order.String));
  const { start, end } = customRange({ search, dates });
  return (
    <div className="flex flex-wrap gap-3">
      <DateSelect label={TEXT.from} dates={sorted} value={start} onChoose={pickFrom} />
      <DateSelect label={TEXT.to} dates={sorted} value={end} onChoose={pickTo} />
    </div>
  );
};

export { CustomPeriod };
