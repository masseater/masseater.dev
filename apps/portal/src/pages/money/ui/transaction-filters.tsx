import { Button } from "@masseater.dev/ui/button";
import { Array as Arr, pipe } from "effect";
import { useMemo } from "react";
import type { ReactNode } from "react";

import type { MoneySearchValue, PeriodValue, SettingsValue } from "#/entities/money";
import { SelectField } from "#/shared/ui";

const TEXT = {
  category: "カテゴリー",
  account: "口座",
  all: "すべて",
  apply: "絞り込む",
} as const;

export const TransactionFilters = ({
  period,
  search,
  settings,
}: Readonly<{
  period: PeriodValue;
  search: MoneySearchValue;
  settings: SettingsValue;
}>): ReactNode => {
  const categories = useMemo(
    () =>
      pipe(
        settings.categories,
        Arr.map((category) => ({ value: category.id, label: category.label })),
      ),
    [settings.categories],
  );
  const accounts = useMemo(
    () =>
      pipe(
        settings.accounts,
        Arr.map((account) => ({ value: account.id, label: account.name })),
      ),
    [settings.accounts],
  );
  return (
    <form action="/money" className="flex flex-wrap items-end gap-3" method="get">
      <input name="from" type="hidden" value={period.from} />
      <input name="to" type="hidden" value={period.to} />
      <SelectField
        all={TEXT.all}
        choices={categories}
        label={TEXT.category}
        name="category"
        value={search.category ?? ""}
      />
      <SelectField
        all={TEXT.all}
        choices={accounts}
        label={TEXT.account}
        name="account"
        value={search.account ?? ""}
      />
      <Button type="submit" variant="outline">
        {TEXT.apply}
      </Button>
    </form>
  );
};
