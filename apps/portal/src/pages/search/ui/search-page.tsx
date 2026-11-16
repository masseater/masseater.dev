import { getRouteApi } from "@tanstack/react-router";
import { String as Str } from "effect";
import type { ReactNode } from "react";

import { SearchField } from "#/shared/ui/index.ts";

import { FoundMemos } from "./found-memos.tsx";
import { FoundRecords } from "./found-records.tsx";
import { FoundSlides } from "./found-slides.tsx";

const route = getRouteApi("/search");

const LABEL = "記録・メモ・スライドを検索";

const ASK = "探す言葉を入れてください";

export const SearchPage = (): ReactNode => {
  const { keyword = "" } = route.useSearch();
  return (
    <>
      <SearchField action="/search" label={LABEL} value={keyword} />
      {Str.isEmpty(keyword) && <p className="text-muted-foreground text-sm">{ASK}</p>}
      {Str.isNonEmpty(keyword) && (
        <div className="grid min-w-0 gap-5 xl:grid-cols-3">
          <FoundRecords keyword={keyword} />
          <FoundMemos keyword={keyword} />
          <FoundSlides keyword={keyword} />
        </div>
      )}
    </>
  );
};
