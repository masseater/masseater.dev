import type { Meta } from "@masseater.dev/nimado";
import { Array as Arr } from "effect";
import type { ReactNode } from "react";

import { useEntries } from "#/pages/ranking/model/entries";
import type { Entries } from "#/pages/ranking/model/entries";
import { TEXT } from "#/pages/ranking/model/labels";
import { useRankingSearch } from "#/pages/ranking/model/update";

import { Note } from "./note";
import { RankingList } from "./ranking-list";

const NOTES: Readonly<Record<Exclude<Entries["status"], "success">, string>> = {
  pending: TEXT.loading,
  error: TEXT.failed,
  short: TEXT.short,
};

const RankingResults = ({ meta }: Readonly<{ meta: typeof Meta.Type }>): ReactNode => {
  const search = useRankingSearch();
  const result = useEntries({ meta, search });
  if (result.status !== "success") {
    return <Note text={NOTES[result.status]} />;
  }
  if (Arr.isReadonlyArrayEmpty(result.entries)) {
    return <Note text={TEXT.empty} />;
  }
  return <RankingList entries={result.entries} page={search.page} />;
};

export { RankingResults };
