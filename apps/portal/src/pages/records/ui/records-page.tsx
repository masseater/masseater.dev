import { getRouteApi } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { LifeList } from "#/entities/watashi";
import { useRecords } from "#/pages/records/api/records-query";
import { Card, CardHeader, SearchField } from "#/shared/ui";

const route = getRouteApi("/records");

const TEXT = { search: "記録を探す", list: "ライフ記録" } as const;

const ACTION = "/records";

export const RecordsPage = (): ReactNode => {
  const { keyword = "" } = route.useSearch();
  return (
    <Card>
      <CardHeader title={TEXT.list}>
        <SearchField action={ACTION} label={TEXT.search} value={keyword} />
      </CardHeader>
      <LifeList items={useRecords()} label={TEXT.list} />
    </Card>
  );
};
