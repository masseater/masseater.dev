import type { Meta } from "@masseater.dev/nimado";
import { Array as Arr } from "effect";
import type { ReactNode } from "react";

import {
  useEntries,
  TEXT,
  usableSearch,
  useRankingSearch,
  Note,
} from "#/entities/ranking/index.ts";
import type { Entries } from "#/entities/ranking/index.ts";

import { RankingList } from "./ranking-list.tsx";

const NOTES: Readonly<Record<Exclude<Entries["status"], "success">, string>> = {
  pending: TEXT.loading,
  error: TEXT.failed,
  short: TEXT.short,
};

export const RankingResults = ({
  meta,
  youtube,
}: Readonly<{ meta: typeof Meta.Type; youtube: boolean }>): ReactNode => {
  const search = usableSearch({ search: useRankingSearch(), youtube });
  const result = useEntries({ meta, search });
  if (result.status !== "success") {
    return <Note text={NOTES[result.status]} />;
  }
  if (Arr.isReadonlyArrayEmpty(result.entries)) {
    return <Note text={TEXT.empty} />;
  }
  return <RankingList entries={result.entries} page={search.page} youtube={youtube} />;
};
