import { getRouteApi } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { KeywordForm } from "#/shared/ui/keyword-form";
import { PageTitle } from "#/shared/ui/page-title";

import { SongsTable } from "./songs-table";

const TITLE = "曲";
const DESCRIPTION = "素材として使われた曲の一覧です。使われた本数の多い順に並びます。";

const route = getRouteApi("/songs/");

const SongsPage = (): ReactNode => {
  const { keyword } = route.useSearch();
  return (
    <div className="flex flex-col gap-6">
      <PageTitle title={TITLE} description={DESCRIPTION} />
      <div className="max-w-xl">
        <KeywordForm action="/songs" label="曲名・アーティスト・別表記" keyword={keyword} />
      </div>
      <SongsTable />
    </div>
  );
};

export { SongsPage };
