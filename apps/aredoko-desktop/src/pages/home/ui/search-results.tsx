import { Option, pipe } from "effect";
import type { ReactNode } from "react";

import { useSearch, useKinds, useQueryText, useSelectedPackage } from "#/entities/asset/index.ts";
import { searchViewOf } from "#/pages/home/model/search-view.ts";
import type { SearchPhase } from "#/pages/home/model/search-view.ts";
import { Notice } from "#/shared/ui/notice.tsx";

import { MatchedResults } from "./matched-results.tsx";

const phaseOf = ({
  isPending,
  fetchStatus,
}: Readonly<{ isPending: boolean; fetchStatus: string }>): SearchPhase => {
  if (!isPending) {
    return "settled";
  }
  if (fetchStatus === "idle") {
    return "idle";
  }
  return "searching";
};

export const SearchResults = (): ReactNode => {
  const query = useQueryText();
  const kinds = useKinds();
  const search = useSearch({ query, kinds, packageId: useSelectedPackage() });
  const view = searchViewOf({
    phase: phaseOf(search),
    failure: pipe(
      Option.fromNullOr(search.error),
      Option.map(({ message }) => message),
    ),
    results: Option.fromUndefinedOr(search.data),
  });
  if (view.status === "idle") {
    return false;
  }
  if (view.status === "results") {
    return <MatchedResults matches={view.matches} others={view.others} />;
  }
  return <Notice tone={view.tone}>{view.text}</Notice>;
};
