import { getRouteApi } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { KeywordForm } from "#/shared/ui/keyword-form";

const route = getRouteApi("/search");

const SearchHeader = (): ReactNode => {
  const { keyword } = route.useSearch();
  return (
    <div className="flex flex-col gap-3">
      <h1 className="font-display text-3xl">{`「${keyword ?? ""}」の検索結果`}</h1>
      <div className="max-w-xl">
        <KeywordForm action="/search" label="曲・動画・担当者" keyword={keyword} />
      </div>
    </div>
  );
};

export { SearchHeader };
