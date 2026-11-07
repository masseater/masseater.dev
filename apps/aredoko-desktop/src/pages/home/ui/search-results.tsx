import { Option, pipe } from "effect";
import type { ReactNode } from "react";

import { useSearch } from "#/pages/home/api/queries";
import { searchViewOf, useKinds, useQueryText, useSelectedPackage } from "#/pages/home/model";
import { Notice } from "#/shared/ui/notice";

import { MatchedResults } from "./matched-results.tsx";

const phaseOf = ({
  isPending,
  fetchStatus,
}: Readonly<{ isPending: boolean; fetchStatus: string }>): "idle" | "searching" | "settled" => {
  if (!isPending) {
    return "settled";
  }
  if (fetchStatus === "idle") {
    return "idle";
  }
  return "searching";
};

const SearchResults = (): ReactNode => {
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

export { SearchResults };
