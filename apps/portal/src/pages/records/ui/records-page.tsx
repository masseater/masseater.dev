import { getRouteApi } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { LifeList } from "#/entities/watashi";
import { useRecords } from "#/pages/records/api/records-query";
import { SearchField } from "#/shared/ui";

const route = getRouteApi("/_watashi/records");

const TEXT = { search: "記録を探す", list: "人生の記録" } as const;

const ACTION = "/records";

const RecordsPage = (): ReactNode => {
  const { keyword = "" } = route.useSearch();
  return (
    <div className="flex flex-col gap-6">
      <SearchField action={ACTION} label={TEXT.search} value={keyword} />
      <LifeList items={useRecords()} label={TEXT.list} />
    </div>
  );
};

export { RecordsPage };
